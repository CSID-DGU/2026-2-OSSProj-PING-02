package com.malssiat.notification

import java.util.concurrent.CopyOnWriteArraySet

/**
 * 알림 리스너(시스템 서비스)가 새 메시지를 저장했다는 신호를 RN 모듈에 전하는 중계 (#71).
 *
 * - 리스너와 RN 모듈은 같은 프로세스지만 서로를 모른다. RN 모듈은 앱 화면이 살아 있을 때만 등록한다.
 * - 메시지 내용은 넘기지 않는다 ("새로 저장됨"만).
 */
object NotificationEvents {
    private val listeners = CopyOnWriteArraySet<() -> Unit>()

    fun addListener(listener: () -> Unit) {
        listeners.add(listener)
    }

    fun removeListener(listener: () -> Unit) {
        listeners.remove(listener)
    }

    /** 새 메시지를 1건 이상 저장했을 때 리스너가 부른다 */
    fun notifySaved() {
        listeners.forEach { runCatching(it) }
    }
}
