package com.malssiat.notification

/** 알림에 연결된 대화 바로가기 정보 (Ranking.getConversationShortcutInfo에서 꺼낸 값) */
data class ConversationShortcut(
    val id: String,
    val shortLabel: String?,
    val longLabel: String?,
) {
    /** 대화방 이름으로 쓸 값. 긴 이름이 있으면 그걸, 없으면 짧은 이름 */
    val label: String?
        get() = longLabel?.takeIf { it.isNotBlank() } ?: shortLabel?.takeIf { it.isNotBlank() }
}
