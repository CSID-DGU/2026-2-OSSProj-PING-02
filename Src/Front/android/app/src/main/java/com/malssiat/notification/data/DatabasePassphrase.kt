package com.malssiat.notification.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.SecureRandom
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
 * - 감싼 암호를 풀 수 없으면(Keystore 키가 사라진 경우 등) [KeyUnavailableException]을 던진다.
 *   이때 DB는 열 수 없으므로 호출하는 쪽에서 DB와 암호를 지우고 새로 만든다 ([reset]).
 */
class DatabasePassphrase(context: Context) {

    class KeyUnavailableException(cause: Throwable) : Exception("DB 암호를 풀 수 없습니다.", cause)

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun exists(): Boolean = prefs.contains(KEY_WRAPPED)

    /** 저장된 암호를 돌려주고, 없으면 새로 만들어 저장한다 */
    fun getOrCreate(): ByteArray {
        val wrapped = prefs.getString(KEY_WRAPPED, null)
        if (wrapped != null) {
            return try {
                unwrap(wrapped)
            } catch (e: Exception) {
                throw KeyUnavailableException(e)
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
        val bytes = Base64.decode(stored, Base64.NO_WRAP)
        val ivSize = bytes[0].toInt()
        val iv = bytes.copyOfRange(1, 1 + ivSize)
        val encrypted = bytes.copyOfRange(1 + ivSize, bytes.size)
        val key = keyStore().getKey(KEY_ALIAS, null) as? SecretKey
            ?: error("Keystore 키가 없습니다.")
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
