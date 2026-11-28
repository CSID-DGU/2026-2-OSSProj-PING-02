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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * 원문 보관 주기(30일마다 전체 삭제)와 DB 암호화 보조 함수.
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

    // savedDaysAgo일 전에 저장된 원문 (메시지 시각도 같게)
    private fun message(id: String, savedDaysAgo: Double, at: Long = now) = NotificationEntity(
        packageName = "com.kakao.talk",
        appName = "카카오톡",
        conversationId = "room1",
        conversationTitle = "민수",
        sender = "민수",
        text = "메시지 $id",
        isGroupConversation = false,
        messageTime = at - (savedDaysAgo * DAY_MS).toLong(),
        messageId = id,
        notificationKey = "key",
        savedAt = at - (savedDaysAgo * DAY_MS).toLong(),
    )

    private val day = DAY_MS

    @Test
    fun `기본 주기는 30일이고 1~365일로 맞춘다`() {
        assertEquals(30, retention.getDays())
        assertEquals(1, NotificationRetention.clampDays(0))
        assertEquals(365, NotificationRetention.clampDays(1000))
    }

    @Test
    fun `가장 최근 주기 경계 - 첫 주기 안이면 없고, 여러 주기를 건너뛰면 마지막 경계로`() {
        val start = now - 10 * day
        assertNull(NotificationRetention.lastBoundary(start, 30, now))
        assertEquals(start + 30 * day, NotificationRetention.lastBoundary(start, 30, start + 30 * day))
        assertEquals(start + 60 * day, NotificationRetention.lastBoundary(start, 30, start + 65 * day))
    }

    @Test
    fun `가입일부터 30일이 지나면 그 전에 저장된 원문을 모두 지우고 그때부터 다음 주기를 센다`() = runBlocking {
        val dao = db.notificationDao()
        val signup = now - 20 * day
        retention.startCycleIfFirst(signup, dao, now)
        dao.insertAll(listOf(message("a", 15.0), message("b", 1.0)))

        // 첫 주기 안: 지우지 않음, 아직 지운 적 없음
        assertEquals(0, retention.purgeIfDue(dao, now + PURGE_INTERVAL_MS))
        assertNull(retention.info(now).lastFullDeleteAt)
        assertEquals(signup + 30 * day, retention.info(now).nextFullDeleteAt)

        // 가입일 + 30일이 지나면 전부
        val later = signup + 31 * day
        assertEquals(2, retention.purgeIfDue(dao, later))
        assertEquals(0, dao.count())
        val info = retention.info(later)
        assertEquals(signup + 30 * day, info.lastFullDeleteAt)
        assertEquals(signup + 60 * day, info.nextFullDeleteAt)
        // 지운 시각보다 오래된 메시지는 다시 저장하지 않음
        assertTrue(retention.isExpired(signup + 29 * day))
        assertFalse(retention.isExpired(signup + 30 * day + 1))
    }

    @Test
    fun `가입일은 한 번도 지우기 전에만 첫 주기 시작으로 쓴다`() = runBlocking {
        val dao = db.notificationDao()
        retention.deleteAllNow(dao, now)
        retention.startCycleIfFirst(now - 100 * day, dao, now)
        assertEquals(now, retention.info(now).cycleStartAt)
    }

    @Test
    fun `지금 바로 삭제하면 원문을 모두 지우고 그 시각부터 주기를 다시 센다`() = runBlocking {
        val dao = db.notificationDao()
        retention.startCycleIfFirst(now - 20 * day, dao, now)
        dao.insertAll(listOf(message("a", 3.0), message("b", 1.0)))

        assertEquals(2, retention.deleteAllNow(dao, now))
        val info = retention.info(now)
        assertEquals(now, info.lastFullDeleteAt)
        assertEquals(now + 30 * day, info.nextFullDeleteAt)
    }

    @Test
    fun `확인은 1시간에 한 번만 하고 시계가 뒤로 가면 다시 한다`() = runBlocking {
        val dao = db.notificationDao()
        retention.startCycleIfFirst(now - 30 * day - 1, dao, now - PURGE_INTERVAL_MS)
        dao.insertAll(listOf(message("a", 1.0)))

        assertEquals(0, retention.purgeIfDue(dao, now - PURGE_INTERVAL_MS + 1))
        assertEquals(1, retention.purgeIfDue(dao, now))

        dao.insertAll(listOf(message("b", 0.5, at = now)))
        // 다음 주기 전이라 시계가 뒤로 가도 지울 것은 없음
        assertEquals(0, retention.purgeIfDue(dao, now - 1000))
    }

    @Test
    fun `주기를 줄여 이미 지났으면 바로 지운다`() = runBlocking {
        val dao = db.notificationDao()
        retention.startCycleIfFirst(now - 10 * day, dao, now)
        dao.insertAll(listOf(message("a", 5.0)))

        assertEquals(1, retention.setDays(7, dao, now))
        assertEquals(7, retention.getDays())
        assertEquals(now - 10 * day + 7 * day, retention.info(now).lastFullDeleteAt)
    }

    @Test
    fun `탈퇴 등으로 처음부터 - 원문과 주기 기록을 모두 지운다`() = runBlocking {
        val dao = db.notificationDao()
        retention.deleteAllNow(dao, now - day)
        dao.insertAll(listOf(message("a", 0.1)))

        assertEquals(1, retention.reset(dao))
        assertNull(retention.info(now).lastFullDeleteAt)
        // 다음 사용자의 가입일이 다시 첫 주기 시작이 됨
        retention.startCycleIfFirst(now - 3 * day, dao, now)
        assertEquals(now - 3 * day, retention.info(now).cycleStartAt)
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
