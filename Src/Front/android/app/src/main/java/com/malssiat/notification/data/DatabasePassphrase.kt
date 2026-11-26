package com.malssiat.notification.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * 알림 DB(SQLCipher) 암호.
 *
 * - 암호는 기기에서 무작위로 만든 32바이트(16진수 64자)이고, 사용자 비밀번호와는 관계없다.
 * - 암호 자체는 Android Keystore의 AES-GCM 키로 감싸서(암호화해서) SharedPreferences에 둔다.
 *   Keystore 키는 기기 밖으로 꺼낼 수 없으므로, 앱 파일만 복사해서는 DB를 열 수 없다.
 * - 감싼 암호를 **다시는 풀 수 없을 때만** [KeyLostException]을 던진다 ([isPermanentKeyFailure]).
 *   Keystore 키가 없음, 키가 영구 무효(KeyPermanentlyInvalidated), 인증 태그 불일치(AEADBadTag), 저장값 손상.
 *   이때는 호출하는 쪽에서 암호를 새로 만들고([reset]) 옛 암호로 잠긴 DB를 지운다.
 * - 그 밖의 실패(부팅 직후 Keystore가 준비되지 않음, 일시적인 Keystore 오류 등)는 그대로 던진다.
 *   DB는 지우지 않고 그대로 두며, 다음에 DB를 열 때 다시 시도한다.
 */
class DatabasePassphrase(context: Context) {

    /** 저장된 암호를 다시는 풀 수 없음. 다시 시도해도 결과가 같다 */
    class KeyLostException(message: String, cause: Throwable? = null) : Exception(message, cause)

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** 저장된 암호를 돌려주고, 없으면 새로 만들어 저장한다 */
    fun getOrCreate(): ByteArray {
        val wrapped = prefs.getString(KEY_WRAPPED, null)
        if (wrapped != null) {
            return try {
                unwrap(wrapped)
            } catch (e: KeyLostException) {
                throw e
            } catch (e: Exception) {
                if (isPermanentKeyFailure(e)) throw KeyLostException("DB 암호를 풀 수 없습니다.", e)
                throw e // 일시적인 실패일 수 있으므로 지우지 않고 다음에 다시 시도
            }
        }

        val passphrase = newPassphrase()
        // 암호를 저장하기 전에 DB가 만들어지면 다음 실행에서 열 수 없으므로 commit()으로 바로 기록한다.
        check(prefs.edit().putString(KEY_WRAPPED, wrap(passphrase)).commit()) { "DB 암호를 저장하지 못했습니다." }
        return passphrase
    }

    /** 저장된 암호와 Keystore 키를 지운다 (DB도 같이 지워야 함) */
    fun reset() {
        prefs.edit().remove(KEY_WRAPPED).commit()
        runCatching { keyStore().deleteEntry(KEY_ALIAS) }
    }

    private fun wrap(plain: ByteArray): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateWrappingKey())
        val iv = cipher.iv
        val encrypted = cipher.doFinal(plain)
        return Base64.encodeToString(byteArrayOf(iv.size.toByte()) + iv + encrypted, Base64.NO_WRAP)
    }

    private fun unwrap(stored: String): ByteArray {
        val (iv, encrypted) = parseWrapped(stored)
        val keyStore = keyStore()
        // 키가 아예 없으면(앱 데이터 복원, 키 삭제 등) 다시 시도해도 풀 수 없다
        if (!keyStore.containsAlias(KEY_ALIAS)) throw KeyLostException("Keystore 키가 없습니다.")
        val key = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
            ?: throw KeyLostException("Keystore 항목이 AES 키가 아닙니다.")
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, iv))
        return cipher.doFinal(encrypted)
    }

    private fun getOrCreateWrappingKey(): SecretKey {
        (keyStore().getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    companion object {
        private const val PREFS_NAME = "malssiat_db_key"
        private const val KEY_WRAPPED = "notification_db_passphrase"
        private const val KEY_ALIAS = "malssiat_notification_db"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_BITS = 128
        private const val GCM_TAG_BYTES = GCM_TAG_BITS / 8

        /**
         * 다시 시도해도 풀 수 없는 실패인지.
         * - KeyPermanentlyInvalidatedException: 잠금 화면 변경 등으로 키가 영구히 무효가 됨
         * - AEADBadTagException: 저장값이 이 키로 감싼 것이 아니거나 손상됨
         * 그 밖의 Keystore 오류(KeyStoreException, ProviderException, UnrecoverableKeyException 등)는
         * 부팅 직후나 일시적인 상태일 수 있어 false.
         */
        fun isPermanentKeyFailure(e: Throwable): Boolean =
            generateSequence(e) { it.cause }.take(10).any {
                it is KeyPermanentlyInvalidatedException || it is AEADBadTagException
            }

        /**
         * 저장값(Base64: IV 길이 1바이트 + IV + 암호문)을 나눈다.
         * 형식이 깨졌으면 다시 읽어도 같으므로 [KeyLostException].
         */
        fun parseWrapped(stored: String): Pair<ByteArray, ByteArray> {
            val bytes = try {
                Base64.decode(stored, Base64.NO_WRAP)
            } catch (e: IllegalArgumentException) {
                throw KeyLostException("저장된 DB 암호 형식이 깨졌습니다.", e)
            }
            val ivSize = bytes.firstOrNull()?.toInt() ?: 0
            if (ivSize !in 12..16 || bytes.size <= 1 + ivSize + GCM_TAG_BYTES) {
                throw KeyLostException("저장된 DB 암호 형식이 깨졌습니다.")
            }
            return bytes.copyOfRange(1, 1 + ivSize) to bytes.copyOfRange(1 + ivSize, bytes.size)
        }

        /**
         * 무작위 32바이트를 16진수 문자열(UTF-8 바이트)로 만든다.
         * SQLCipher는 이 값을 비밀번호로 받아 키를 유도하고, 16진수라 SQL 문(ATTACH ... KEY '...')에 그대로 넣어도 안전하다.
         */
        fun newPassphrase(random: SecureRandom = SecureRandom()): ByteArray {
            val raw = ByteArray(32).also(random::nextBytes)
            return raw.joinToString("") { "%02x".format(it) }.toByteArray(Charsets.UTF_8)
        }
    }
}
