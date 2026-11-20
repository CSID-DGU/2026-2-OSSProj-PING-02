package com.malssiat.notification

import android.app.Notification
import android.os.Process
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * 갤럭시 실기기에서 받은 카카오톡 알림 원본(2026-11)을 그대로 재현해서 파서를 검증한다.
 * 실행: cd android && ./gradlew :app:testDebugUnitTest
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class NotificationParserTest {

    private val context = RuntimeEnvironment.getApplication()

    private val me = Person.Builder().setName("민재").build()
    private val yeonbi = Person.Builder().setName("김연비").build()

    private fun kakaoMessage(text: String, time: Long, chatLogId: Long, from: Person = yeonbi) =
        NotificationCompat.MessagingStyle.Message(text, time, from).also {
            it.extras.putLong("chatLogId", chatLogId)
            it.extras.putInt("flags", 1)
            it.extras.putLong("threadId", 0)
        }

    /** 카카오톡처럼: 제목은 보낸 사람, conversationTitle 없음, shortcutId = 채팅방 ID */
    private fun kakaoNotification(
        roomId: String,
        isGroup: Boolean,
        vararg messages: NotificationCompat.MessagingStyle.Message,
    ): StatusBarNotification {
        val style = NotificationCompat.MessagingStyle(me).setGroupConversation(isGroup)
        messages.forEach { style.addMessage(it) }
        val notification = NotificationCompat.Builder(context, "new_message_v18")
            .setContentTitle(messages.last().person?.name)
            .setContentText(messages.last().text)
            .setShortcutId(roomId)
            .setCategory(Notification.CATEGORY_MESSAGE)
            .setGroup("chat_message")
            .setStyle(style)
            .build()
        return sbn("com.kakao.talk", roomId, notification)
    }

    private fun sbn(pkg: String, tag: String?, notification: Notification) =
        @Suppress("DEPRECATION")
        StatusBarNotification(
            pkg, pkg, 2, tag, 10344, 0, 0, notification, Process.myUserHandle(), 1_794_904_342_365L,
        )

    @Test
    fun `카카오톡 1대1 - 채팅방 ID와 chatLogId를 저장하고 상대 이름을 방 이름으로 쓴다`() {
        val sbn = kakaoNotification(
            roomId = "479159803895773",
            isGroup = false,
            kakaoMessage("짧은 1:1카톡", 1_794_904_179_734L, 3_975_923_190_898_698_241L),
            kakaoMessage("짧은 1:1카톡", 1_794_904_342_301L, 3_975_924_556_153_038_849L),
        )

        val items = NotificationParser.parse(sbn, "카카오톡", conversationLabel = null)

        assertEquals(2, items.size)
        items.forEach {
            assertEquals("479159803895773", it.conversationId)
            assertEquals("김연비", it.conversationTitle)
            assertEquals("김연비", it.sender)
            assertEquals(false, it.isGroupConversation)
        }
        // 같은 내용을 두 번 보내도 chatLogId가 달라 별개 메시지로 남는다. 큰 숫자도 끝자리까지 그대로.
        assertEquals("3975923190898698241", items[0].messageId)
        assertEquals("3975924556153038849", items[1].messageId)
    }

    @Test
    fun `카카오톡 단톡 - 방 이름을 모르면 보낸 사람 이름을 방 이름으로 쓰지 않는다`() {
        val sbn = kakaoNotification(
            roomId = "479149482880994",
            isGroup = true,
            kakaoMessage("단톡 알림", 1_794_904_551_159L, 3_975_926_302_778_664_962L),
        )

        val item = NotificationParser.parse(sbn, "카카오톡", conversationLabel = null).single()

        assertEquals("479149482880994", item.conversationId)
        assertEquals("", item.conversationTitle) // "김연비"가 되면 1:1 방과 섞인다
        assertEquals("김연비", item.sender)
        assertTrue(item.isGroupConversation)
        assertEquals("3975926302778664962", item.messageId)
    }

    @Test
    fun `카카오톡 단톡 - 대화 바로가기 이름이 있으면 그걸 방 이름으로 쓴다`() {
        val sbn = kakaoNotification(
            roomId = "479149482880994",
            isGroup = true,
            kakaoMessage("단톡 알림", 1_794_904_551_159L, 3_975_926_302_778_664_962L),
        )

        val item = NotificationParser.parse(sbn, "카카오톡", conversationLabel = "OSS_02_PING").single()

        assertEquals("OSS_02_PING", item.conversationTitle)
        assertEquals("479149482880994", item.conversationId)
    }

    @Test
    fun `같은 사람이어도 1대1과 단톡은 대화방 ID가 다르다`() {
        val dm = kakaoNotification(
            "479159803895773", false, kakaoMessage("1:1", 1L, 1L),
        )
        val group = kakaoNotification(
            "479149482880994", true, kakaoMessage("단톡", 2L, 2L),
        )

        val dmItem = NotificationParser.parse(dm, "카카오톡", null).single()
        val groupItem = NotificationParser.parse(group, "카카오톡", null).single()

        assertEquals(dmItem.sender, groupItem.sender)
        assertTrue(dmItem.conversationId != groupItem.conversationId)
    }

    @Test
    fun `카카오톡 멘션 - 본문의 나를 멘션 표시를 떼고 멘션 여부로 저장한다`() {
        val sbn = kakaoNotification(
            "479149482880994",
            true,
            kakaoMessage("저녁 메뉴 추천 받아요", 1_794_906_896_984L, 3_975_945_981_424_154_628L),
            kakaoMessage(
                "[나를 멘션] 단톡방: 나를 @멘션한 메시지\n\n@홍선빈 ",
                1_794_906_960_755L,
                3_975_946_515_767_175_171L,
            ),
        )

        val (normal, mention) = NotificationParser.parse(sbn, "카카오톡", "OSS_02_PING")

        assertEquals(false, normal.isMention)
        assertEquals("저녁 메뉴 추천 받아요", normal.text)
        assertTrue(mention.isMention)
        assertEquals("단톡방: 나를 @멘션한 메시지\n\n@홍선빈", mention.text) // 본문의 @이름은 남긴다
    }

    @Test
    fun `카카오톡 사진과 이모티콘은 image로 표시하고 안내 문구는 그대로 둔다`() {
        val uri = android.net.Uri.parse("content://com.kakao.talk/notification/1")
        val photo = kakaoMessage("사진을 보냈습니다.", 1_794_906_831_744L, 1L).setData("image/", uri)
        val emoticon = kakaoMessage("이모티콘을 보냈습니다.", 1_794_906_809_184L, 2L).setData("image/", uri)
        val text = kakaoMessage("그냥 텍스트", 1_794_906_900_000L, 3L)

        val items = NotificationParser.parse(
            kakaoNotification("485089730396837", false, emoticon, photo, text),
            "카카오톡",
            "김연비",
        )

        assertEquals(listOf("image", "image", "text"), items.map { it.contentType })
        assertEquals("사진을 보냈습니다.", items[1].text)
    }

    @Test
    fun `묶음 요약 알림은 저장하지 않는다`() {
        val summary = NotificationCompat.Builder(context, "quiet_new_message")
            .setGroup("chat_message")
            .setGroupSummary(true)
            .build()

        assertTrue(NotificationParser.parse(sbn("com.kakao.talk", null, summary), "카카오톡", null).isEmpty())
    }

    @Test
    fun `대화 바로가기가 없는 일반 알림은 제목으로 대화방 ID를 만든다`() {
        val notification = NotificationCompat.Builder(context, "default")
            .setContentTitle("택배")
            .setContentText("오늘 도착")
            .build()

        val item = NotificationParser.parse(sbn("com.example.shop", "p1", notification), "쇼핑", null).single()

        assertEquals("name:택배", item.conversationId)
        assertEquals("택배", item.conversationTitle)
        assertEquals("오늘 도착", item.text)
        assertEquals(null, item.messageId)
    }
}
