package com.malssiat.notification

import android.app.Notification
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import com.malssiat.notification.data.NotificationEntity

/**
 * StatusBarNotification에서 저장할 메시지 텍스트를 뽑아낸다.
 *
 * - 메신저(카카오톡, 인스타그램 DM, 문자 등)는 대부분 MessagingStyle을 써서
 *   알림 하나에 최근 메시지 목록이 함께 들어 있다. 이 경우 메시지마다 한 행으로 나눈다.
 * - MessagingStyle이 아닌 알림은 제목·본문을 한 행으로 저장한다.
 * - 대화가 아닌 알림(인스타 좋아요, 인증·비밀번호 재설정 문자, 광고 문자)은 저장하지 않는다.
 *
 * 실제 기기(갤럭시, 2026-11)에서 확인한 형식. 원본은 노션 "말씨앗 알림 케이스별 원본 데이터".
 *
 * [카카오톡]
 * - 1:1과 단톡 모두 conversationTitle이 비어 있고, android.title은 "보낸 사람 이름"이다.
 *   단톡방 이름은 대화 바로가기(shortcut) 이름으로만 온다 (예: "OSS_02_PING"). 오픈채팅도 같다.
 * - shortcutId(= tag)가 채팅방 ID다. 메시지마다 extras.chatLogId(Long)가 있다.
 * - sender_person.key는 채팅방마다 달라서 여러 방에 걸친 사람 식별에는 못 쓴다.
 * - 나를 멘션한 메시지는 본문 앞에 "[나를 멘션] "이 붙는다.
 * - 사진·이모티콘은 본문이 "사진을 보냈습니다." / "이모티콘을 보냈습니다."이고 type "image/"가 붙는다.
 * - 미리보기 "이름만": 형식은 같고 본문만 "새로운 메시지가 있습니다."
 * - 미리보기 "표시 안 함": BigTextStyle로 바뀐다. 제목·단톡 여부·messages가 없고,
 *   chatLogId는 알림 extras 맨 위에, 상대 이름은 대화 바로가기 이름에만 있다.
 *
 * [인스타그램]
 * - DM만 channelId "ig_direct", tag "direct|...", push_category "direct_v2_..."이다.
 *   좋아요 등은 channelId "ig_priority_...", tag "newstab|...", push_category "post_like" 등.
 * - 1:1의 conversationTitle은 상대가 아니라 인스타 아이디(내 것 또는 상대 것)라 쓰지 않는다.
 *   상대 이름은 대화 바로가기 이름. 그룹은 conversationTitle과 바로가기 이름 모두 그룹 이름이다.
 * - sender_person.key가 인스타 사용자 ID라 여러 방에서 같다 (이름은 1:1은 별명, 그룹은 실명으로 다를 수 있음).
 * - 릴스·게시물 공유는 본문이 "회원님에게 릴스를 보냈습니다"이고 push_category가 "direct_v2_clips_share" 등.
 * - push_id·ig_action(x=메시지ID)은 알림 단위 값이라 마지막 메시지에만 해당한다.
 *
 * [문자 (삼성 메시지)]
 * - 이름·번호 앞뒤에 보이지 않는 방향 표시 문자(U+2068/U+2069 등)가 붙는다 → 지운다.
 * - 보낸 사람 번호는 sender_person.uri("tel:...")에 있다. 이름은 연락처 이름(이모지 포함 가능)이다.
 * - 단체 문자는 isGroupConversation true, 방 이름은 "참여자1, 참여자2(인원수)".
 * - 메시지 고유 ID가 없다 → (대화방, 보낸 사람, 본문, 시각)으로 중복을 막는다.
 * - 이미지가 붙은 MMS도 본문에 실제 내용이 있을 수 있다 (type "image/" + 긴 본문).
 * - messagingUser.uri에 내 번호가 있다 → 저장하지 않는다.
 */
object NotificationParser {

    private const val KAKAO = "com.kakao.talk"
    private const val INSTAGRAM = "com.instagram.android"
    private val SMS_PACKAGES = setOf(
        "com.samsung.android.messaging",
        "com.google.android.apps.messaging",
    )

    /** 메시지 extras에서 메시지 고유 ID로 쓸 키. 앱별로 확인되는 대로 추가한다. */
    private val MESSAGE_ID_KEYS = listOf(
        "chatLogId", // 카카오톡
    )

    /** 본문 앞에 붙는 "나를 멘션함" 표시 */
    private val MENTION_PREFIXES = listOf(
        "[나를 멘션]", // 카카오톡
    )

    /** 실제 내용 대신 오는 안내 문구. 저장은 하되 AI 요약에서는 뺀다 */
    private val PLACEHOLDER_TEXTS = setOf(
        "새로운 메시지가 있습니다.", // 카카오톡 미리보기 꺼짐
    )
    private val PLACEHOLDER_PATTERNS = listOf(
        Regex("^(사진|이모티콘|동영상|파일|음성메시지)을? ?보냈습니다\\.?$"), // 카카오톡
        Regex("^회원님에게 .+(을|를) 보냈습니다\\.?$"), // 인스타그램 릴스·게시물 공유
    )

    /** 보이지 않는 방향 표시·폭 없는 문자 (문자 앱이 이름·번호 앞뒤에 붙임) */
    private val INVISIBLE_CHARS = Regex("[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]")

    /** 인증·보안 문자 판별 문구. 숫자만 있는 문자는 일반 대화일 수 있어 숫자로는 판별하지 않는다 */
    private val SECURITY_SMS = Regex(
        "인증\\s?번호|인증\\s?코드|확인\\s?코드|비밀번호|재설정|본인\\s?확인|승인\\s?번호|OTP|verification code|security code",
        RegexOption.IGNORE_CASE,
    )

    /** 광고 문자는 법적으로 "(광고)" 표시를 붙여야 한다 */
    private val AD_SMS = Regex("^\\s*(\\[Web발신\\]\\s*)?\\(광고\\)")

    /**
     * @param conversationLabel 알림에 연결된 대화 바로가기의 이름 (Android 11+, 없으면 null).
     *   카카오톡 단톡방 이름, 인스타 1:1 상대 이름은 여기서만 정확히 얻을 수 있다.
     */
    fun parse(
        sbn: StatusBarNotification,
        appName: String,
        conversationLabel: String?,
    ): List<NotificationEntity> {
        val notification = sbn.notification ?: return emptyList()

        // 묶음 알림의 요약("새 메시지 3개")과 상시 알림(음악 재생, 다운로드 등)은 대화 내용이 아니다.
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return emptyList()
        if (notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return emptyList()
        if (!isConversationNotification(sbn)) return emptyList()

        val label = conversationLabel?.let(::clean)?.takeIf { it.isNotBlank() }
        val style = NotificationCompat.MessagingStyle
            .extractMessagingStyleFromNotification(notification)

        val items = if (style != null && style.messages.isNotEmpty()) {
            parseMessagingStyle(sbn, appName, notification, style, label)
        } else {
            listOfNotNull(parsePlain(sbn, appName, notification, label))
        }
        return items.filterNot { isUnwantedSms(sbn.packageName, it.text) }
    }

    /** 앱별로 "대화" 알림인지. 인스타는 좋아요·댓글·팔로우 알림이 같은 앱에서 오므로 DM만 남긴다 */
    private fun isConversationNotification(sbn: StatusBarNotification): Boolean {
        if (sbn.packageName != INSTAGRAM) return true
        val channelId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            sbn.notification.channelId
        } else {
            null
        }
        val pushCategory = instagramExtra(sbn.notification.extras, "push_category")
        return channelId == "ig_direct" ||
            sbn.tag?.startsWith("direct|") == true ||
            pushCategory?.startsWith("direct_v2") == true
    }

    /** 문자 중 저장하지 않을 것: 인증·비밀번호 재설정 문자, (광고) 문자 */
    private fun isUnwantedSms(packageName: String, text: String): Boolean {
        if (packageName !in SMS_PACKAGES) return false
        return SECURITY_SMS.containsMatchIn(text) || AD_SMS.containsMatchIn(text)
    }

    private fun parseMessagingStyle(
        sbn: StatusBarNotification,
        appName: String,
        notification: Notification,
        style: NotificationCompat.MessagingStyle,
        label: String?,
    ): List<NotificationEntity> {
        val extras = notification.extras
        val fallbackTitle = clean(extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty())
        val myName = clean(style.user.name?.toString().orEmpty())
        // 단톡 플래그를 안 넣는 앱도 있어서, 나 말고 보낸 사람이 둘 이상이면 단톡으로 본다.
        val otherSenders = style.messages.mapNotNull { it.person?.name?.toString() }.toSet()
        val isGroup = style.isGroupConversation || otherSenders.size > 1
        val styleTitle = style.conversationTitle?.toString()?.let(::clean)?.takeIf { it.isNotBlank() }

        // 대화방 이름
        // - 단톡: 알림의 대화방 제목 → 바로가기 이름. 둘 다 없으면 비워 둔다
        //   (android.title은 보낸 사람 이름이라 쓰면 같은 사람과의 1:1 방과 이름이 겹친다).
        // - 1:1: 바로가기 이름(상대 이름) → 알림 제목 순. 인스타는 1:1의 conversationTitle이
        //   상대가 아니라 인스타 아이디라서 1:1에서는 conversationTitle을 쓰지 않는다.
        val conversation = if (isGroup) {
            styleTitle ?: label ?: ""
        } else {
            label ?: styleTitle?.takeIf { sbn.packageName != INSTAGRAM } ?: fallbackTitle
        }

        val lastIndex = style.messages.lastIndex
        val notificationMessageId = notificationMessageIdOf(sbn.packageName, extras)
        val sharedByCategory = sbn.packageName == INSTAGRAM &&
            instagramExtra(extras, "push_category")?.let { it.startsWith("direct_v2") && it != "direct_v2_text" } == true

        return style.messages.mapIndexedNotNull { index, message ->
            val rawText = message.text?.toString()?.let(::clean)?.trim()
            if (rawText.isNullOrEmpty()) return@mapIndexedNotNull null
            val (text, isMention) = splitMention(rawText)

            // person이 없으면 사용자 본인이 보낸 메시지다 (알림에서 바로 답장한 경우 등).
            val sender = message.person?.name?.toString()?.let(::clean) ?: myName
            val title = conversation.ifBlank { if (isGroup) "" else sender }
            val isLast = index == lastIndex
            // 인스타 공유는 알림 단위 push_category로 마지막 메시지만 확실히 알 수 있고,
            // 앞선 메시지는 안내 문구로 판별한다.
            val isShare = (isLast && sharedByCategory) || isInstagramShareText(sbn.packageName, text)

            NotificationEntity(
                packageName = sbn.packageName,
                appName = appName,
                conversationId = conversationIdOf(sbn, title),
                conversationTitle = title,
                sender = sender,
                senderId = senderIdOf(sbn.packageName, message.person),
                text = text,
                isGroupConversation = isGroup,
                messageTime = message.timestamp.takeIf { it > 0 } ?: sbn.postTime,
                isMention = isMention,
                contentType = if (isShare) NotificationEntity.CONTENT_SHARE else contentTypeOf(message.dataMimeType),
                isPlaceholder = isShare || isPlaceholderText(text),
                // 메시지 자체 ID가 없으면 알림 단위 ID를 마지막 메시지에만 붙인다.
                messageId = messageIdOf(message.extras) ?: notificationMessageId?.takeIf { isLast },
                notificationKey = sbn.key,
            )
        }
    }

    private fun parsePlain(
        sbn: StatusBarNotification,
        appName: String,
        notification: Notification,
        label: String?,
    ): NotificationEntity? {
        val extras = notification.extras
        val title = clean(extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()).trim()
        // 펼친 알림의 긴 본문이 있으면 그걸 쓴다 (접힌 본문은 잘려 있을 수 있음).
        val text = (
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)
            )?.toString()?.let(::clean)?.trim()

        if (text.isNullOrEmpty()) return null

        // 일부 메신저는 단톡방 이름을 subText에 넣는다.
        val explicitConversation = (
            extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)
                ?: extras.getCharSequence(Notification.EXTRA_SUB_TEXT)
            )?.toString()?.let(::clean)?.trim()?.takeIf { it.isNotEmpty() }
        // 단톡 여부는 알림이 알려 준 값만 믿는다. 바로가기 이름은 1:1 상대 이름일 수도 있어 근거로 쓰지 않는다
        // (카카오톡 미리보기 "표시 안 함"은 제목 없이 바로가기 이름만 상대 이름으로 온다).
        val isGroup = if (extras.containsKey(Notification.EXTRA_IS_GROUP_CONVERSATION)) {
            extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION)
        } else {
            explicitConversation != null && explicitConversation != title
        }
        val conversation = explicitConversation ?: label ?: title
        // 제목이 없으면 1:1에서는 바로가기 이름(상대)이 보낸 사람이다.
        val sender = title.ifBlank { if (isGroup) "" else label.orEmpty() }

        return NotificationEntity(
            packageName = sbn.packageName,
            appName = appName,
            conversationId = conversationIdOf(sbn, conversation),
            conversationTitle = conversation,
            sender = sender,
            senderId = null,
            text = text,
            isGroupConversation = isGroup,
            // 알림이 갱신돼도 when은 그대로인 경우가 많아 중복 저장을 막는 기준으로 쓴다.
            messageTime = notification.`when`.takeIf { it > 0 } ?: sbn.postTime,
            isPlaceholder = isPlaceholderText(text),
            messageId = notificationMessageIdOf(sbn.packageName, extras),
            notificationKey = sbn.key,
        )
    }

    /**
     * 본문 앞의 멘션 표시를 떼어 낸다.
     * 카카오톡: "[나를 멘션] 단톡방: 나를 @멘션한 메시지\n\n@홍선빈 " → 멘션 표시만 빼고 본문의 @이름은 그대로 둔다.
     */
    private fun splitMention(text: String): Pair<String, Boolean> {
        val prefix = MENTION_PREFIXES.firstOrNull { text.startsWith(it) } ?: return text to false
        val body = text.removePrefix(prefix).trim()
        // 표시만 있고 내용이 비면 원문을 그대로 둔다.
        return (body.ifEmpty { text }) to true
    }

    private fun isPlaceholderText(text: String): Boolean =
        text in PLACEHOLDER_TEXTS || PLACEHOLDER_PATTERNS.any { it.matches(text) }

    private fun isInstagramShareText(packageName: String, text: String): Boolean =
        packageName == INSTAGRAM && PLACEHOLDER_PATTERNS.last().matches(text)

    /**
     * 메시지에 붙은 미디어 타입으로 메시지 종류를 정한다.
     * 카카오톡은 사진·이모티콘 모두 type "image/"와 함께 본문을 "사진을 보냈습니다." 같은 안내 문구로 보낸다.
     * 문자 MMS는 type "image/"여도 본문에 실제 내용이 있을 수 있다 (안내 문구 여부는 isPlaceholder로 따로 본다).
     */
    private fun contentTypeOf(mimeType: String?): String = when {
        mimeType.isNullOrBlank() -> NotificationEntity.CONTENT_TEXT
        mimeType.startsWith("image") -> NotificationEntity.CONTENT_IMAGE
        mimeType.startsWith("video") -> NotificationEntity.CONTENT_VIDEO
        mimeType.startsWith("audio") -> NotificationEntity.CONTENT_AUDIO
        else -> NotificationEntity.CONTENT_FILE
    }

    /**
     * 여러 대화방에 걸쳐 같은 사람을 찾을 때 쓸 보낸 사람 ID. 이름은 방·앱마다 달라서 쓰지 않는다.
     * - 문자: 전화번호 (sender_person.uri "tel:...")
     * - 인스타: 인스타 사용자 ID (sender_person.key)
     * - 카카오톡: 없음 (sender_person.key가 채팅방마다 달라서 사람 식별에 못 씀)
     */
    private fun senderIdOf(packageName: String, person: androidx.core.app.Person?): String? {
        if (person == null) return null
        val uri = person.uri?.let(::clean)
        if (uri != null && uri.startsWith("tel:")) {
            val phone = uri.removePrefix("tel:").filter { it.isDigit() || it == '+' }
            return phone.takeIf { it.isNotEmpty() }?.let { "tel:$it" }
        }
        if (packageName == INSTAGRAM) return person.key?.let { "ig:$it" }
        return null
    }

    /**
     * 대화방 ID. 대화 바로가기 ID(카카오톡은 채팅방 ID) → 대화방 이름 → 알림 키 순으로 정한다.
     * 이름도 없는 단톡은 알림 키로 대신한다 (메신저는 대개 대화방마다 알림을 따로 쓴다).
     */
    private fun conversationIdOf(sbn: StatusBarNotification, title: String): String {
        val shortcutId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            sbn.notification.shortcutId
        } else {
            null
        }
        return when {
            !shortcutId.isNullOrBlank() -> shortcutId
            title.isNotBlank() -> "name:$title"
            else -> "key:${sbn.key}"
        }
    }

    private fun messageIdOf(extras: Bundle): String? =
        MESSAGE_ID_KEYS.firstNotNullOfOrNull { key ->
            @Suppress("DEPRECATION")
            extras.get(key)?.toString()?.takeIf { it.isNotBlank() }
        }

    /**
     * 알림 단위로 붙은 "마지막 메시지"의 ID.
     * - 카카오톡: extras.chatLogId (미리보기 "표시 안 함"이면 이것뿐)
     * - 인스타: ig_action의 x=메시지ID
     */
    private fun notificationMessageIdOf(packageName: String, extras: Bundle): String? = when (packageName) {
        KAKAO -> messageIdOf(extras)
        INSTAGRAM -> instagramExtra(extras, "ig_action")
            ?.let { Regex("[?&]x=([^&]+)").find(it)?.groupValues?.get(1) }
            ?.let { "ig:$it" }
        else -> null
    }

    private fun instagramExtra(extras: Bundle, name: String): String? =
        extras.getString("com.instagram.android.igns.logging.$name")

    /** 보이지 않는 문자 제거 */
    fun clean(value: String): String = value.replace(INVISIBLE_CHARS, "")
}
