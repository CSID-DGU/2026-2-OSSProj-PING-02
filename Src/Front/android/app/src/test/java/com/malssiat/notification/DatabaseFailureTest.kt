package com.malssiat.notification

import android.database.sqlite.SQLiteCantOpenDatabaseException
import android.database.sqlite.SQLiteDatabaseCorruptException
import android.database.sqlite.SQLiteDatabaseLockedException
import android.database.sqlite.SQLiteException
import android.database.sqlite.SQLiteOutOfMemoryException
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.util.Base64
import com.malssiat.notification.data.DatabaseEncryption
import com.malssiat.notification.data.DatabasePassphrase
import com.malssiat.notification.data.DatabasePassphrase.KeyLostException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.security.KeyStoreException
import java.security.ProviderException
import java.security.UnrecoverableKeyException
import javax.crypto.AEADBadTagException

/**
 * DB를 지울지(다시는 열 수 없음) 남기고 다시 시도할지(일시적인 실패) 가르는 기준.
 * 일시적인 실패로 30일치 대화가 지워지지 않게 하는 것이 목적이다.
 */
@RunWith(RobolectricTestRunner::class)
class DatabaseFailureTest {

    @Test
    fun `Keystore 키가 영구 무효이거나 인증 태그가 틀리면 다시 풀 수 없는 실패다`() {
        assertTrue(DatabasePassphrase.isPermanentKeyFailure(KeyPermanentlyInvalidatedException("잠금 화면 변경")))
        assertTrue(DatabasePassphrase.isPermanentKeyFailure(AEADBadTagException("tag mismatch")))
        // 다른 예외에 감싸여 와도 원인을 본다
        assertTrue(DatabasePassphrase.isPermanentKeyFailure(RuntimeException(AEADBadTagException())))
    }

    @Test
    fun `부팅 직후·일시적인 Keystore 오류는 지우지 않고 다시 시도한다`() {
        assertFalse(DatabasePassphrase.isPermanentKeyFailure(KeyStoreException("keystore not ready")))
        assertFalse(DatabasePassphrase.isPermanentKeyFailure(ProviderException("Keystore operation failed")))
        assertFalse(DatabasePassphrase.isPermanentKeyFailure(UnrecoverableKeyException("Failed to obtain key")))
        assertFalse(DatabasePassphrase.isPermanentKeyFailure(IllegalStateException()))
    }

    @Test
    fun `저장된 암호 형식이 깨졌으면 다시 풀 수 없는 실패다`() {
        val ok = byteArrayOf(12) + ByteArray(12) { 1 } + ByteArray(80) { 2 }
        val (iv, encrypted) = DatabasePassphrase.parseWrapped(Base64.encodeToString(ok, Base64.NO_WRAP))
        assertEquals(12, iv.size)
        assertEquals(80, encrypted.size)

        val broken = listOf(
            "",
            "!!!not base64!!!",
            Base64.encodeToString(byteArrayOf(99) + ByteArray(40), Base64.NO_WRAP), // IV 길이가 이상함
            Base64.encodeToString(byteArrayOf(12) + ByteArray(20), Base64.NO_WRAP), // 암호문이 너무 짧음
        )
        broken.forEach { stored ->
            try {
                DatabasePassphrase.parseWrapped(stored)
                throw AssertionError("깨진 저장값을 받아들임: $stored")
            } catch (expected: KeyLostException) {
                // 다시 풀 수 없는 실패로 분류
            }
        }
    }

    @Test
    fun `암호가 다르거나 손상된 DB만 지운다`() {
        assertTrue(DatabaseEncryption.isUnreadableDatabase(SQLiteDatabaseCorruptException("file is not a database")))
        assertTrue(DatabaseEncryption.isUnreadableDatabase(SQLiteException("file is not a database (code 26 SQLITE_NOTADB)")))
        assertTrue(DatabaseEncryption.isUnreadableDatabase(SQLiteException("database disk image is malformed (code 11)")))
    }

    @Test
    fun `메모리 부족·파일 잠김·열기 실패는 지우지 않고 다시 시도한다`() {
        assertFalse(DatabaseEncryption.isUnreadableDatabase(SQLiteOutOfMemoryException("out of memory (code 7)")))
        assertFalse(DatabaseEncryption.isUnreadableDatabase(SQLiteDatabaseLockedException("database is locked (code 5)")))
        assertFalse(DatabaseEncryption.isUnreadableDatabase(SQLiteCantOpenDatabaseException("unable to open database (code 14)")))
        assertFalse(DatabaseEncryption.isUnreadableDatabase(SQLiteException("disk I/O error (code 266)")))
        assertFalse(DatabaseEncryption.isUnreadableDatabase(SQLiteException("(code 1106 SQLITE_IOERR_SHMOPEN)")))
    }
}
