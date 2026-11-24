package com.malssiat.notification

import androidx.room.Room
import com.malssiat.notification.data.DatabaseEncryption
import com.malssiat.notification.data.DatabasePassphrase
import com.malssiat.notification.data.NotificationDatabase
import com.malssiat.notification.data.NotificationEntity
import com.malssiat.notification.data.NotificationRetention
import com.malssiat.notification.data.NotificationRetention.Companion.DAY_MS
import com.malssiat.notification.data.NotificationRetention.Companion.PURGE_INTERVAL_MS
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * 메시지 보관 기간 정리와 DB 암호화 보조 함수.
 * SQLCipher 네이티브 라이브러리·Android Keystore는 JVM에서 돌지 않으므로, 암호화 자체는 에뮬레이터에서 확인한다.
 */
@RunWith(RobolectricTestRunner::class)
class NotificationRetentionTest {

    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var db: NotificationDatabase
    private lateinit var retention: NotificationRetention

    private val now = 1_790_000_000_000L // 2026-09 무렵

    @Before
    fun setUp() {
        val context = RuntimeEnvironment.getApplication()
        // 테스트는 암호화하지 않은 메모리 DB로 같은 DAO를 확인한다
        db = Room.inMemoryDatabaseBuilder(context, NotificationDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        retention = NotificationRetention(context)
        context.getSharedPreferences("malssiat_notification_prefs", 0).edit().clear().commit()
    }

    @After
    fun tearDown() = db.close()

    private fun message(id: String, ageDays: Double) = NotificationEntity(
        packageName = "com.kakao.talk",
        appName = "카카오톡",
        conversationId = "room1",
        conversationTitle = "민수",
        sender = "민수",
        text = "메시지 $id",
        isGroupConversation = false,
        messageTime = now - (ageDays * DAY_MS).toLong(),
        messageId = id,
        notificationKey = "key",
        savedAt = now,
    )

    @Test
    fun `기본 보관 기간은 30일이고 1~365일로 맞춘다`() {
        assertEquals(30, retention.getDays())
        assertEquals(1, NotificationRetention.clampDays(0))
        assertEquals(365, NotificationRetention.clampDays(1000))
        assertEquals(now - 30 * DAY_MS, NotificationRetention.cutoffOf(now, 30))
    }

    @Test
    fun `보관 기간이 지난 메시지는 저장 전에 걸러진다`() {
        assertTrue(retention.isExpired(now - 31 * DAY_MS, now))
        assertFalse(retention.isExpired(now - 29 * DAY_MS, now))
    }

    @Test
    fun `정리는 30일보다 오래된 메시지만 지운다`() = runBlocking {
        val dao = db.notificationDao()
        dao.insertAll(listOf(message("old", 31.0), message("edge", 29.9), message("new", 1.0)))

        assertEquals(1, retention.purgeIfDue(dao, now))
        assertEquals(listOf("new", "edge"), dao.getRecent(10).map { it.messageId })
    }

    @Test
    fun `정리는 1시간에 한 번만 하고 시계가 뒤로 가면 다시 한다`() = runBlocking {
        val dao = db.notificationDao()
        retention.purgeIfDue(dao, now)
        dao.insertAll(listOf(message("old", 40.0)))

        assertEquals(0, retention.purgeIfDue(dao, now + PURGE_INTERVAL_MS - 1))
        assertEquals(1, retention.purgeIfDue(dao, now + PURGE_INTERVAL_MS))

        dao.insertAll(listOf(message("old2", 40.0)))
        assertEquals(1, retention.purgeIfDue(dao, now - 1000))
    }

    @Test
    fun `보관 기간을 줄이면 바로 지운다`() = runBlocking {
        val dao = db.notificationDao()
        retention.purgeIfDue(dao, now)
        dao.insertAll(listOf(message("a", 10.0), message("b", 3.0)))

        assertEquals(1, retention.setDays(7, dao, now))
        assertEquals(7, retention.getDays())
        assertEquals(listOf("b"), dao.getRecent(10).map { it.messageId })
    }

    @Test
    fun `평문 SQLite 파일만 평문으로 판별한다`() {
        val plain = tmp.newFile("plain.db").apply {
            writeBytes("SQLite format 3\u0000".toByteArray(Charsets.US_ASCII) + ByteArray(100))
        }
        val encrypted = tmp.newFile("enc.db").apply { writeBytes(ByteArray(116) { (it * 37).toByte() }) }
        val short = tmp.newFile("short.db").apply { writeBytes(ByteArray(4)) }

        assertTrue(DatabaseEncryption.isPlaintext(plain))
        assertFalse(DatabaseEncryption.isPlaintext(encrypted))
        assertFalse(DatabaseEncryption.isPlaintext(short))
    }

    @Test
    fun `DB 암호는 매번 다른 16진수 64자다`() {
        val a = String(DatabasePassphrase.newPassphrase(), Charsets.UTF_8)
        val b = String(DatabasePassphrase.newPassphrase(), Charsets.UTF_8)
        assertTrue(a.matches(Regex("[0-9a-f]{64}")))
        assertTrue(a != b)
    }
}
