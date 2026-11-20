package com.malssiat.notification

import android.app.Notification
import android.app.Person
import android.graphics.Bitmap
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.service.notification.StatusBarNotification
import com.malssiat.notification.data.NotificationEntity
import com.malssiat.notification.data.RawNotificationDump
import org.json.JSONArray
import org.json.JSONObject

/**
 * 테스트용: 알림 원본을 JSON으로 펼친다.
 *
 * extras(제목, 본문, 메시지 목록 등)를 키 하나도 빼지 않고 담고,
 * 우리 파서가 이 알림을 어떻게 해석했는지(parsed)도 함께 남겨서 비교할 수 있게 한다.
 */
object NotificationDumper {

    private val FLAG_NAMES = listOf(
        Notification.FLAG_ONGOING_EVENT to "ONGOING_EVENT",
        Notification.FLAG_GROUP_SUMMARY to "GROUP_SUMMARY",
        Notification.FLAG_AUTO_CANCEL to "AUTO_CANCEL",
        Notification.FLAG_NO_CLEAR to "NO_CLEAR",
        Notification.FLAG_FOREGROUND_SERVICE to "FOREGROUND_SERVICE",
        Notification.FLAG_ONLY_ALERT_ONCE to "ONLY_ALERT_ONCE",
        Notification.FLAG_LOCAL_ONLY to "LOCAL_ONLY",
        Notification.FLAG_INSISTENT to "INSISTENT",
    )

    fun dump(
        sbn: StatusBarNotification,
        appName: String,
        shortcut: ConversationShortcut?,
        parsed: List<NotificationEntity>,
        savedCount: Int,
    ): RawNotificationDump {
        val n = sbn.notification
        val extras = n.extras

        val json = JSONObject().apply {
            put("packageName", sbn.packageName)
            put("appName", appName)
            put("postTime", sbn.postTime)
            put("key", sbn.key)
            put("id", sbn.id)
            put("tag", sbn.tag ?: JSONObject.NULL)
            put("groupKey", sbn.groupKey)
            put("isGroup", sbn.isGroup)
            put("isOngoing", sbn.isOngoing)
            put("when", n.`when`)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                put("channelId", n.channelId ?: JSONObject.NULL)
                put("shortcutId", n.shortcutId ?: JSONObject.NULL)
            }
            put("category", n.category ?: JSONObject.NULL)
            put("group", n.group ?: JSONObject.NULL)
            put("sortKey", n.sortKey ?: JSONObject.NULL)
            put("flags", JSONArray(FLAG_NAMES.filter { (bit, _) -> n.flags and bit != 0 }.map { it.second }))
            put("tickerText", n.tickerText?.toString() ?: JSONObject.NULL)
            // 알림 extras 밖에서 오는 대화방 정보 (카카오톡 단톡방 이름은 여기에만 있음)
            put(
                "conversationShortcut",
                shortcut?.let {
                    JSONObject().apply {
                        put("id", it.id)
                        put("shortLabel", it.shortLabel ?: JSONObject.NULL)
                        put("longLabel", it.longLabel ?: JSONObject.NULL)
                    }
                } ?: JSONObject.NULL,
            )
            put("extras", bundleToJson(extras))
            put("parsed", JSONArray(parsed.map { it.toJson() }))
            // parsed 중 실제로 DB에 새로 들어간 건수. 나머지는 이미 저장돼 있던 중복이다.
            put("savedCount", savedCount)
        }

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()

        return RawNotificationDump(
            packageName = sbn.packageName,
            appName = appName,
            postedAt = sbn.postTime,
            summary = maskPhones(listOf(title, text).filter { it.isNotBlank() }.joinToString(": ").take(200)),
            // 원본은 팀원끼리 노션·메신저로 공유하므로 전화번호(상대·내 번호)는 가려서 남긴다.
            json = maskPhones(json.toString(2)),
        )
    }

    private val MOBILE_NUMBER = Regex("(?<!\\d)(01[016789])[-\\s]?\\d{3,4}[-\\s]?(\\d{4})(?!\\d)")
    private val TEL_URI = Regex("tel:(\\+?\\d{3})\\d*(\\d{2})")

    /** 휴대폰 번호와 tel: 주소를 "010-****-1234" / "tel:010****34" 형태로 가린다 */
    fun maskPhones(value: String): String = value
        .replace(TEL_URI) { "tel:${it.groupValues[1]}****${it.groupValues[2]}" }
        .replace(MOBILE_NUMBER) { "${it.groupValues[1]}-****-${it.groupValues[2]}" }

    private fun bundleToJson(bundle: Bundle): JSONObject {
        val obj = JSONObject()
        for (key in bundle.keySet().sorted()) {
            // 다른 앱 전용 클래스가 들어 있으면 꺼내다 실패할 수 있어서 키마다 따로 감싼다.
            val value = runCatching {
                @Suppress("DEPRECATION")
                toJsonValue(bundle.get(key))
            }.getOrElse { "[읽기 실패: ${it.javaClass.simpleName}]" }
            obj.put(key, value)
        }
        return obj
    }

    private fun toJsonValue(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is Boolean, is Int, is Long, is Double, is Float -> value
        is CharSequence -> value.toString()
        is Bundle -> bundleToJson(value)
        is Bitmap -> "[Bitmap ${value.width}x${value.height}]"
        is Icon -> "[Icon]"
        // Person은 Android 9(API 28)부터 있는 클래스라 버전을 먼저 확인한다.
        else -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && value is Person) {
            personToJson(value)
        } else {
            otherToJsonValue(value)
        }
    }

    private fun otherToJsonValue(value: Any): Any = when (value) {
        is Array<*> -> JSONArray(value.map { toJsonValue(it) })
        is Collection<*> -> JSONArray(value.map { toJsonValue(it) })
        is IntArray -> JSONArray(value.toList())
        is LongArray -> JSONArray(value.toList())
        is BooleanArray -> JSONArray(value.toList())
        is Parcelable -> "[${value.javaClass.name}]"
        else -> "[${value.javaClass.name}] $value"
    }

    @androidx.annotation.RequiresApi(Build.VERSION_CODES.P)
    private fun personToJson(person: Person) = JSONObject().apply {
        put("name", person.name?.toString() ?: JSONObject.NULL)
        put("key", person.key ?: JSONObject.NULL)
        put("uri", person.uri ?: JSONObject.NULL)
        put("isBot", person.isBot)
        put("isImportant", person.isImportant)
    }

    private fun NotificationEntity.toJson() = JSONObject().apply {
        put("conversationId", conversationId)
        put("conversationTitle", conversationTitle)
        put("messageId", messageId ?: JSONObject.NULL)
        put("sender", sender)
        put("senderId", senderId ?: JSONObject.NULL)
        put("text", text)
        put("isPlaceholder", isPlaceholder)
        put("isGroupConversation", isGroupConversation)
        put("isMention", isMention)
        put("contentType", contentType)
        put("messageTime", messageTime)
    }
}
