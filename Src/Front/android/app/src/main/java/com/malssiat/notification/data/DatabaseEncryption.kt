package com.malssiat.notification.data

import android.content.Context
import android.database.sqlite.SQLiteDatabaseCorruptException
import android.database.sqlite.SQLiteException
import android.util.Log
import net.zetetic.database.DatabaseErrorHandler
import net.zetetic.database.sqlcipher.SQLiteDatabase
import java.io.File

/**
 * 알림 DB를 SQLCipher로 여는 준비.
 *
 * Room이 DB를 열기 전에 [prepare]를 한 번 부른다.
 * - SQLCipher 네이티브 라이브러리를 불러온다.
 * - 암호화 전에 만든 평문 DB(v6까지)가 있으면 같은 내용으로 암호화한 DB로 바꾼다 (메시지 유지).
 *   바꾸다 실패하면 원본을 지우지 않고 예외를 던진다 (다음에 DB를 열 때 다시 시도).
 * - **다시는 열 수 없는 것이 확실할 때만** DB를 지우고 새로 시작한다.
 *   - 저장된 암호를 다시는 풀 수 없음 ([DatabasePassphrase.KeyLostException]: 키 없음·영구 무효·AEADBadTag·저장값 손상)
 *   - DB가 이 암호의 DB가 아니거나 손상됨 ([isUnreadableDatabase]: SQLITE_NOTADB, SQLITE_CORRUPT)
 *   (대화 원문은 기기에만 있으므로 복구할 곳이 없다. 알림창에 남은 알림부터 다시 쌓인다)
 * - 그 밖의 실패(부팅 직후 Keystore 미준비, 메모리 부족, 파일 잠김 등)는 일시적일 수 있으므로 DB를 지우지 않고 예외를 던진다.
 *   NotificationDatabase.get이 실패하고, 다음에 DB를 열 때(다음 알림, 다음 화면 조회) 다시 시도한다.
 */
object DatabaseEncryption {

    private const val TAG = "MalssiatNotification"
    private const val ENCRYPTING_SUFFIX = "-encrypting"
    private val SQLITE_HEADER = "SQLite format 3\u0000".toByteArray(Charsets.US_ASCII)

    @Volatile
    private var libraryLoaded = false

    fun loadLibrary() {
        if (libraryLoaded) return
        synchronized(this) {
            if (!libraryLoaded) {
                System.loadLibrary("sqlcipher")
                libraryLoaded = true
            }
        }
    }

    /** Room에 넘길 DB 암호를 돌려준다. 필요하면 평문 DB를 암호화하거나 열 수 없는 DB를 지운다 */
    fun prepare(context: Context, dbName: String, passphraseStore: DatabasePassphrase): ByteArray {
        loadLibrary()
        val file = context.getDatabasePath(dbName)
        recoverInterruptedEncryption(file)

        val passphrase = try {
            passphraseStore.getOrCreate()
        } catch (e: DatabasePassphrase.KeyLostException) {
            // 옛 암호로 잠긴 DB는 읽을 수 없으므로 지운다. 아직 평문 DB면 새 암호로 암호화하면 되므로 남긴다.
            Log.w(TAG, "DB 암호를 다시 풀 수 없어 새 암호를 만듭니다.", e)
            passphraseStore.reset()
            if (file.exists() && !isPlaintext(file)) deleteDatabaseFiles(file)
            passphraseStore.getOrCreate()
        }

        when {
            !file.exists() -> Unit
            file.length() == 0L -> deleteDatabaseFiles(file)
            isPlaintext(file) -> encryptPlaintext(file, passphrase)
            !canOpen(file, passphrase) -> {
                Log.w(TAG, "DB가 지금 암호로 열리지 않아(SQLITE_NOTADB/CORRUPT) 지우고 새로 시작합니다.")
                deleteDatabaseFiles(file)
            }
        }
        return passphrase
    }

    /** 파일 앞 16바이트가 SQLite 평문 헤더인지. SQLCipher로 암호화한 파일은 앞부분도 무작위 값이다 */
    fun isPlaintext(file: File): Boolean {
        if (file.length() < SQLITE_HEADER.size) return false
        val head = ByteArray(SQLITE_HEADER.size)
        file.inputStream().use { input ->
            var read = 0
            while (read < head.size) {
                val n = input.read(head, read, head.size - read)
                if (n < 0) return false
                read += n
            }
        }
        return head.contentEquals(SQLITE_HEADER)
    }

    /**
     * 평문 DB를 암호화한 사본으로 옮긴 뒤 원본을 지우고 사본을 원래 이름으로 바꾼다.
     * Room이 마이그레이션 단계를 판단하는 user_version도 같이 옮기고, 행 수가 같은지 확인한 뒤에만 원본을 지운다.
     * 실패하면 사본만 지우고 원본(평문)은 그대로 둔 채 예외를 던진다.
     * 이때 DB는 열리지 않고(알림 저장도 멈춤), 다음에 DB를 열 때 다시 시도한다. 버그로 사용자 메시지가 지워지지 않게 하려는 것.
     */
    private fun encryptPlaintext(file: File, passphrase: ByteArray) {
        val encrypted = encryptingFileOf(file)
        encrypted.delete()
        try {
            // ATTACH한 DB는 원본 연결의 열기 옵션을 따르므로, 사본 파일을 새로 만들 수 있게 CREATE_IF_NECESSARY도 준다.
            val plain = SQLiteDatabase.openDatabase(
                file.path,
                ByteArray(0),
                null,
                SQLiteDatabase.OPEN_READWRITE or SQLiteDatabase.CREATE_IF_NECESSARY,
                null,
                null,
            )
            val version: Int
            val rows: Long
            try {
                version = plain.version
                rows = countMessages(plain)
                // ATTACH는 execSQL로 보낸다. execSQL은 ATTACH 전에 WAL을 꺼 주고, 실패하면 예외를 던진다.
                plain.execSQL(
                    "ATTACH DATABASE ? AS encrypted KEY ?",
                    arrayOf<Any>(encrypted.path, String(passphrase, Charsets.UTF_8)),
                )
                plain.rawExecSQL("SELECT sqlcipher_export('encrypted')")
                plain.execSQL("DETACH DATABASE encrypted")
            } finally {
                plain.close()
            }

            // user_version은 sqlcipher_export가 옮기지 않으므로, 사본을 암호로 직접 열어서 쓰고 행 수도 확인한다.
            val copy = SQLiteDatabase.openDatabase(
                encrypted.path, passphrase, null, SQLiteDatabase.OPEN_READWRITE, null, null,
            )
            try {
                copy.version = version
                val copied = countMessages(copy)
                check(copied == rows) { "암호화한 DB의 행 수가 다릅니다 (원본 $rows, 사본 $copied)." }
            } finally {
                copy.close()
            }

            deleteDatabaseFiles(file)
            check(encrypted.renameTo(file)) { "암호화한 DB 이름을 바꾸지 못했습니다." }
            Log.i(TAG, "기존 평문 DB를 암호화했습니다 (메시지 ${rows}건, DB 버전 $version).")
        } catch (e: Exception) {
            encrypted.delete()
            Log.e(TAG, "기존 DB 암호화 실패. 원본은 그대로 두고 다음에 다시 시도합니다.", e)
            throw e
        }
    }

    /** 메시지 행 수. 테이블이 아직 없으면(빈 DB) 0 */
    private fun countMessages(db: SQLiteDatabase): Long {
        db.rawQuery(
            "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'notification_messages'",
            emptyArray<String>(),
        ).use { if (!it.moveToFirst() || it.getLong(0) == 0L) return 0 }
        db.rawQuery("SELECT count(*) FROM notification_messages", emptyArray<String>()).use {
            return if (it.moveToFirst()) it.getLong(0) else 0
        }
    }

    /**
     * 암호화 도중 앱이 꺼진 경우 정리.
     * 원본을 지운 뒤 이름을 바꾸기 전에 꺼졌으면 사본은 이미 완성된 것이므로 원래 이름으로 바꾼다.
     * 원본이 남아 있으면 사본은 덜 만들어졌을 수 있으므로 지우고 다시 암호화한다.
     */
    private fun recoverInterruptedEncryption(file: File) {
        val encrypted = encryptingFileOf(file)
        if (!encrypted.exists()) return
        if (!file.exists()) encrypted.renameTo(file) else encrypted.delete()
    }

    /**
     * 이 암호로 열리면 true, 이 암호의 DB가 아니거나 손상됐으면 false.
     * 그 밖의 실패(메모리 부족, 파일 잠김·권한 등)는 일시적일 수 있으므로 그대로 던진다.
     */
    private fun canOpen(file: File, passphrase: ByteArray): Boolean = try {
        // 손상으로 판단될 때 라이브러리 기본 처리(파일 삭제)가 먼저 돌지 않게 아무것도 하지 않는 처리기를 넘긴다
        val db = SQLiteDatabase.openDatabase(
            file.path, passphrase, null, SQLiteDatabase.OPEN_READONLY, KEEP_FILE_ON_CORRUPTION, null,
        )
        try {
            db.version // 첫 페이지를 복호화해야 읽히므로 암호가 틀리면 여기서 실패한다
        } finally {
            db.close()
        }
        true
    } catch (e: SQLiteException) {
        if (isUnreadableDatabase(e)) false else throw e
    }

    /**
     * 다시 열어도 읽을 수 없는 DB인지: SQLITE_NOTADB(26, 암호가 다르거나 DB 파일이 아님)와 SQLITE_CORRUPT(11)만.
     * 보통 SQLiteDatabaseCorruptException으로 오지만, 일반 SQLiteException에 코드만 담겨 올 때도 있어 메시지도 본다.
     */
    fun isUnreadableDatabase(e: SQLiteException): Boolean {
        if (e is SQLiteDatabaseCorruptException) return true
        val message = e.message ?: return false
        return UNREADABLE_MESSAGE.containsMatchIn(message)
    }

    private val KEEP_FILE_ON_CORRUPTION = DatabaseErrorHandler { _, _ -> }

    private val UNREADABLE_MESSAGE =
        Regex("""\(code (11|26)\b|SQLITE_NOTADB|SQLITE_CORRUPT|file is not a database|database disk image is malformed""")

    private fun encryptingFileOf(file: File) = File(file.path + ENCRYPTING_SUFFIX)

    private fun deleteDatabaseFiles(file: File) {
        listOf("", "-wal", "-shm", "-journal").forEach { File(file.path + it).delete() }
    }
}
