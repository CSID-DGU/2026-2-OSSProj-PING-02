package com.malssiat.notification

import android.app.PendingIntent

/**
 * 대화방별로 "알림을 눌렀을 때의 동작"(contentIntent)을 메모리에만 보관한다 (#69).
 *
 * 특정 대화방을 여는 공식 방법이 메신저마다 없어서, 메신저가 알림에 넣어 둔 동작을 그대로 쓴다.
 * - PendingIntent는 DB에 저장할 수 없다. 앱 프로세스가 죽으면 사라지고, 알림 리스너가 다시 연결될 때
 *   알림창에 남아 있는 알림으로 다시 채워진다.
 * - 알림 리스너와 RN 모듈은 같은 프로세스에서 돌아서 이 객체를 같이 쓴다.
 * - 메시지 내용은 담기지 않는다 (메신저 앱을 여는 동작만).
 * 키는 DB와 같은 (패키지, conversationId)다. conversationId는 NotificationParser가 만든 값을 그대로 쓴다.
 */
object ConversationIntents {
    private const val MAX_ENTRIES = 100

    // 접근 순서를 기억해 가장 오래 안 쓴 것부터 지운다
    private val intents = object : LinkedHashMap<String, PendingIntent>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, PendingIntent>?) =
            size > MAX_ENTRIES
    }

    private fun keyOf(packageName: String, conversationId: String) = "$packageName::$conversationId"

    @Synchronized
    fun put(packageName: String, conversationId: String, intent: PendingIntent) {
        intents[keyOf(packageName, conversationId)] = intent
    }

    @Synchronized
    fun get(packageName: String, conversationId: String): PendingIntent? =
        intents[keyOf(packageName, conversationId)]

    @Synchronized
    fun remove(packageName: String, conversationId: String) {
        intents.remove(keyOf(packageName, conversationId))
    }
}
