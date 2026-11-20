package com.malssiat.notification

import android.app.Notification
import android.os.Bundle
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import com.malssiat.notification.data.NotificationEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * 팀원 실기기 테스트(갤럭시, 2026-11) 원본을 재현한 테스트.
 * 원본: 노션 "말씨앗 알림 케이스별 원본 데이터". 이름·ID·번호는 가짜 값으로 바꿨다.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class NotificationParserAppFormatsTest {

    private val context = RuntimeEnvironment.getApplication()

    private fun sbn(pkg: String, tag: String?, notification: Notification) =
        @Suppress("DEPRECATION")
        StatusBarNotification(pkg, pkg, 2, tag, 10000, 0, 0, notification, Process.myUserHandle(), 1_795_000_000_000L)

    private fun messaging(
        channelId: String,
        shortcutId: String?,
        isGroup: Boolean,
        conversationTitle: String?,
        title: String,
        extras: Bundle = Bundle(),
        vararg messages: NotificationCompat.MessagingStyle.Message,
    ): Notification {
        val style = NotificationCompat.MessagingStyle(Person.Builder().setName("⁨나⁩").setUri("tel:01099998888").build())
            .setGroupConversation(isGroup)
            .setConversationTitle(conversationTitle)
        messages.forEach { style.addMessage(it) }
        return NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText(messages.last().text)
            .setShortcutId(shortcutId)
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setStyle(style)
            .addExtras(extras)
            .build()
    }

    // ───────── 카카오톡 미리보기 꺼짐 ─────────

    @Test
    fun `카카오톡 미리보기 이름만 - 안내 문구는 저장하되 내용 없음으로 표시`() {
        val from = Person.Builder().setName("어수빈").setKey("room-scoped-hash").build()
        val msg = NotificationCompat.MessagingStyle.Message("새로운 메시지가 있습니다.", 1L, from)
            .also { it.extras.putLong("chatLogId", 3_977_244_604_808_128_516L) }
        val n = messaging("quiet_new_message", "485344168831884", false, null, "어수빈", Bundle(), msg)

        val item = NotificationParser.parse(sbn("com.kakao.talk", "410135295_485344168831884", n), "카카오톡", "어수빈").single()

        assertTrue(item.isPlaceholder)
        assertEquals("3977244604808128516", item.messageId)
        assertNull(item.senderId) // 카카오톡 sender key는 방마다 달라 사람 ID로 쓰지 않음
    }

    @Test
    fun `카카오톡 미리보기 표시 안 함 - BigText여도 1대1로 보고 바로가기 이름과 chatLogId를 쓴다`() {
        val n = NotificationCompat.Builder(context, "quiet_new_message")
            .setContentText("새로운 메시지가 있습니다.")
            .setStyle(NotificationCompat.BigTextStyle().bigText("새로운 메시지가 있습니다.").setBigContentTitle("카카오톡"))
            .setShortcutId("485344168831884")
            .addExtras(Bundle().apply { putLong("chatLogId", 3_977_244_079_010_179_074L) })
            .build()

        val item = NotificationParser.parse(sbn("com.kakao.talk", "410135295_485344168831884", n), "카카오톡", "어수빈").single()

        assertFalse(item.isGroupConversation) // 예전에는 바로가기 이름 때문에 단톡으로 판단됨
        assertEquals("어수빈", item.sender) // 예전에는 빈 값
        assertEquals("어수빈", item.conversationTitle)
        assertEquals("3977244079010179074", item.messageId) // 예전에는 null
        assertEquals("485344168831884", item.conversationId)
        assertTrue(item.isPlaceholder)
    }

    // ───────── 인스타그램 ─────────

    private fun igExtras(category: String, messageId: String, senderId: String) = Bundle().apply {
        putString("com.instagram.android.igns.logging.push_category", category)
        putString("com.instagram.android.igns.logging.ig_action", "direct_v2?x=$messageId&id=thread1")
        putString("com.instagram.android.igns.logging.sender_id", senderId)
    }

    private fun igPerson(name: String, id: String) = Person.Builder().setName(name).setKey(id).build()

    @Test
    fun `인스타 1대1 DM - 방 이름은 내 아이디가 아니라 상대 이름, 보낸 사람 ID와 메시지 ID를 저장`() {
        val n = messaging(
            "ig_direct", "thread_shortcut_me_thread1", false,
            conversationTitle = "my.insta.id", title = "my.insta.id: 친구1",
            extras = igExtras("direct_v2_text", "m100", "111"),
            NotificationCompat.MessagingStyle.Message("안녕", 1_794_990_712_960L, igPerson("친구1", "111")),
        )

        val item = NotificationParser.parse(sbn("com.instagram.android", "direct|me;thread_id:thread1", n), "Instagram", "친구1").single()

        assertEquals("친구1", item.conversationTitle) // 예전에는 "my.insta.id"
        assertEquals("ig:111", item.senderId)
        assertEquals("ig:m100", item.messageId)
        assertFalse(item.isPlaceholder)
        assertEquals(NotificationEntity.CONTENT_TEXT, item.contentType)
    }

    @Test
    fun `인스타 그룹 DM - 그룹 이름을 쓰고, 이름이 달라도 보낸 사람 ID는 같다`() {
        val n = messaging(
            "ig_direct", "thread_shortcut_me_group1", true,
            conversationTitle = "우리 모임", title = "우리 모임: 실명1",
            extras = igExtras("direct_v2_text", "m200", "111"),
            NotificationCompat.MessagingStyle.Message("메시지 1", 1L, igPerson("실명1", "111")),
            NotificationCompat.MessagingStyle.Message("메시지 2", 2L, igPerson("실명1", "111")),
        )

        val items = NotificationParser.parse(sbn("com.instagram.android", "direct|me;thread_id:group1", n), "Instagram", "우리 모임")

        assertEquals(listOf("우리 모임", "우리 모임"), items.map { it.conversationTitle })
        assertTrue(items.all { it.isGroupConversation })
        assertEquals(listOf("ig:111", "ig:111"), items.map { it.senderId }) // 1:1의 "친구1"과 같은 사람으로 맞출 수 있음
        assertEquals(listOf(null, "ig:m200"), items.map { it.messageId }) // 알림 단위 ID는 마지막 메시지만
    }

    @Test
    fun `인스타 릴스 공유 - share이자 내용 없음으로 표시`() {
        val from = igPerson("가족A", "222")
        val n = messaging(
            "ig_direct", "thread_shortcut_me_thread2", false,
            conversationTitle = "family.a.id", title = "family.a.id: 가족A",
            extras = igExtras("direct_v2_clips_share", "m300", "222"),
            NotificationCompat.MessagingStyle.Message("회원님에게 릴스를 보냈습니다", 1L, from),
            NotificationCompat.MessagingStyle.Message("회원님에게 릴스를 보냈습니다", 2L, from),
        )

        val items = NotificationParser.parse(sbn("com.instagram.android", "direct|me;thread_id:thread2", n), "Instagram", "가족A")

        assertTrue(items.all { it.contentType == NotificationEntity.CONTENT_SHARE && it.isPlaceholder })
        assertEquals("가족A", items.first().conversationTitle)
    }

    @Test
    fun `인스타 좋아요 알림은 저장하지 않는다`() {
        val n = NotificationCompat.Builder(context, "ig_priority_hdsup_vib_snd")
            .setContentTitle("새로운 좋아요 2개 이상")
            .setContentText("내 게시물 알림")
            .setStyle(NotificationCompat.BigPictureStyle())
            .addExtras(Bundle().apply { putString("com.instagram.android.igns.logging.push_category", "post_like") })
            .build()

        val items = NotificationParser.parse(sbn("com.instagram.android", "newstab|123_post_like", n), "Instagram", null)

        assertTrue(items.isEmpty()) // 예전에는 "새로운 좋아요 2개 이상"이라는 가짜 대화방이 생김
    }

    // ───────── 문자 ─────────

    private fun smsPerson(name: String, phone: String) =
        Person.Builder().setName("⁨$name⁩").setKey("⁨$name⁩tel:$phone").setUri("tel:$phone").build()

    @Test
    fun `문자 1대1 - 이름의 보이지 않는 문자를 지우고 전화번호를 보낸 사람 ID로`() {
        val n = messaging(
            "CHANNEL_ID_SMS_MMS", "b8b9131da3ab9849", false, null, "⁨친구1 😊⁩", Bundle(),
            NotificationCompat.MessagingStyle.Message("1", 1_795_074_707_467L, smsPerson("친구1 😊", "01012345678")),
        )

        val item = NotificationParser.parse(
            sbn("com.samsung.android.messaging", "com.samsung.android.messaging:MESSAGE_RECEIVED:705", n),
            "메시지",
            "⁨친구1 😊⁩",
        ).single()

        assertEquals("친구1 😊", item.sender)
        assertEquals("친구1 😊", item.conversationTitle)
        assertEquals("tel:01012345678", item.senderId)
        assertFalse(item.isGroupConversation)
    }

    @Test
    fun `단체 문자 - 방 이름 정리, 숫자만 있는 메시지도 그대로 저장`() {
        val n = messaging(
            "CHANNEL_ID_SMS_MMS", "5ba4faabecee3a8", true,
            conversationTitle = "⁨⁨가족A⁩⁨, ⁩⁨친구1⁩⁩(3)", title = "⁨⁨가족A⁩⁨, ⁩⁨친구1⁩⁩(3): ⁨친구1⁩", extras = Bundle(),
            NotificationCompat.MessagingStyle.Message("123456789", 1L, smsPerson("친구1", "01012345678")),
        )

        val item = NotificationParser.parse(sbn("com.samsung.android.messaging", "t", n), "메시지", "⁨⁨가족A⁩⁨, ⁩⁨친구1⁩⁩(3)").single()

        assertEquals("가족A, 친구1(3)", item.conversationTitle)
        assertTrue(item.isGroupConversation)
        assertEquals("123456789", item.text) // 인증번호로 오인하지 않음
    }

    @Test
    fun `인증·비밀번호 재설정 문자와 광고 문자는 저장하지 않는다`() {
        fun sms(text: String) = messaging(
            "CHANNEL_ID_SMS_MMS", "f578bfb94af2503b", false, null, "⁨00182⁩", Bundle(),
            NotificationCompat.MessagingStyle.Message(text, 1L, smsPerson("00182", "001821234567890")),
        )
        val pkg = "com.samsung.android.messaging"

        val reset = NotificationParser.parse(sbn(pkg, "t1", sms("[국제발신]\nInstagram 비밀번호를 재설정하려면 누르세요: https://ig.me/abc")), "메시지", null)
        val code = NotificationParser.parse(sbn(pkg, "t2", sms("[Web발신]\n[토스] 인증번호 [123456]를 입력해주세요.")), "메시지", null)
        val ad = NotificationParser.parse(sbn(pkg, "t3", sms("[Web발신]\n(광고)[쇼핑몰] 오늘만 50% 할인")), "메시지", null)
        val delivery = NotificationParser.parse(sbn(pkg, "t4", sms("[Web발신]\n[CJ대한통운] 고객님의 상품이 배송 완료되었습니다.")), "메시지", null)

        assertTrue(reset.isEmpty())
        assertTrue(code.isEmpty())
        assertTrue(ad.isEmpty())
        assertEquals(1, delivery.size) // 택배 같은 알림성 문자는 저장 (팀 결정 전 기본값)
    }

    @Test
    fun `원본 기록의 전화번호는 가린다`() {
        val masked = NotificationDumper.maskPhones("\"uri\": \"tel:01045308071\", \"title\": \"010-3247-9643\", \"chatLogId\": 3977244079010179074")

        assertEquals("\"uri\": \"tel:010****71\", \"title\": \"010-****-9643\", \"chatLogId\": 3977244079010179074", masked)
    }
}
