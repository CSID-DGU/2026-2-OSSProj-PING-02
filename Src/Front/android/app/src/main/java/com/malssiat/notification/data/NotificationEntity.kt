package com.malssiat.notification.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 알림에서 뽑아낸 메시지 한 건.
 *
 * 메신저 알림(MessagingStyle)은 알림 하나에 최근 메시지 여러 개가 들어 있고,
 * 새 메시지가 올 때마다 이전 메시지까지 다시 담아 알림을 갱신한다. 그래서 같은 메시지는 한 번만 저장한다.
 * - 앱이 메시지 고유 ID를 주면(카카오톡 chatLogId) 그 ID로 중복을 막는다.
 * - 없으면 (앱, 대화방 ID, 보낸 사람, 내용, 메시지 시각)이 같을 때 같은 메시지로 본다.
 */
@Entity(
    tableName = "notification_messages",
    indices = [
        // message_id가 NULL인 행끼리는 SQLite가 중복으로 보지 않으므로, ID가 있는 앱만 이 인덱스로 걸러진다.
        Index(value = ["package_name", "message_id"], unique = true),
        Index(
            value = ["package_name", "conversation_id", "sender", "text", "message_time"],
            unique = true,
        ),
        Index(value = ["package_name", "message_time"]),
    ],
)
data class NotificationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    /** 알림을 보낸 앱 패키지명 (예: com.kakao.talk) */
    @ColumnInfo(name = "package_name")
    val packageName: String,

    /** 저장 시점의 앱 표시 이름 (예: 카카오톡) */
    @ColumnInfo(name = "app_name")
    val appName: String,

    /**
     * 대화방 ID. 대화방을 구분하는 기준.
     * 알림의 대화 바로가기 ID(카카오톡은 채팅방 ID)를 쓰고, 없으면 대화방 이름으로 대신한다.
     * 이름은 겹치거나 바뀔 수 있어서(1:1 상대 이름 = 단톡 보낸 사람 이름) 묶을 때는 이 값을 쓴다.
     */
    @ColumnInfo(name = "conversation_id")
    val conversationId: String,

    /** 대화방 이름 (예: OSS_02_PING). 알 수 없으면 빈 문자열 */
    @ColumnInfo(name = "conversation_title")
    val conversationTitle: String,

    /** 메시지를 보낸 사람. 일반 알림이면 알림 제목 */
    @ColumnInfo(name = "sender")
    val sender: String,

    /**
     * 여러 대화방·앱에 걸쳐 같은 사람을 찾을 때 쓰는 보낸 사람 ID. 이름은 방마다 달라서(별명·실명·이모지) 이걸로 맞춘다.
     * 문자 "tel:01012345678", 인스타 "ig:사용자ID". 카카오톡은 알림에 이런 값이 없어 null.
     */
    @ColumnInfo(name = "sender_id")
    val senderId: String? = null,

    /** 알림 본문 텍스트 */
    @ColumnInfo(name = "text")
    val text: String,

    /** 단톡(그룹 대화) 여부 */
    @ColumnInfo(name = "is_group")
    val isGroupConversation: Boolean,

    /** 메시지가 보내진 시각 (epoch ms). MessagingStyle이 아니면 알림 게시 시각 */
    @ColumnInfo(name = "message_time")
    val messageTime: Long,

    /** 나를 멘션한 메시지인지. 카카오톡은 본문 앞에 "[나를 멘션]"을 붙여 보내고, 저장할 때는 떼어 낸다 */
    @ColumnInfo(name = "is_mention", defaultValue = "0")
    val isMention: Boolean = false,

    /**
     * 메시지 종류. "text" | "image" | "video" | "audio" | "file" | "share".
     * 사진·이모티콘은 본문이 "사진을 보냈습니다." 같은 안내 문구라서, 요약할 때 대화 내용과 구분해야 한다.
     */
    @ColumnInfo(name = "content_type", defaultValue = "'text'")
    val contentType: String = CONTENT_TEXT,

    /**
     * 본문이 실제 대화가 아니라 안내 문구인지 ("새로운 메시지가 있습니다.", "사진을 보냈습니다.",
     * "회원님에게 릴스를 보냈습니다"). 저장은 하되 AI 요약·답장 재료에서는 뺀다.
     */
    @ColumnInfo(name = "is_placeholder", defaultValue = "0")
    val isPlaceholder: Boolean = false,

    /** 앱이 붙여 준 메시지 고유 ID (카카오톡 chatLogId). 없으면 null */
    @ColumnInfo(name = "message_id")
    val messageId: String?,

    /** StatusBarNotification.key. 같은 알림에서 나온 메시지끼리 묶을 때 쓴다 */
    @ColumnInfo(name = "notification_key")
    val notificationKey: String,

    /** 우리 앱이 저장한 시각 (epoch ms) */
    @ColumnInfo(name = "saved_at")
    val savedAt: Long = System.currentTimeMillis(),
) {
    companion object {
        const val CONTENT_TEXT = "text"
        const val CONTENT_IMAGE = "image"
        const val CONTENT_VIDEO = "video"
        const val CONTENT_AUDIO = "audio"
        const val CONTENT_FILE = "file"

        /** 인스타 릴스·게시물 공유처럼 다른 콘텐츠를 공유한 메시지 */
        const val CONTENT_SHARE = "share"
    }
}
