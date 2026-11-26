package com.malssiat.notification

import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.malssiat.notification.data.MonitoredAppsStore
import com.malssiat.notification.data.NotificationDatabase
import com.malssiat.notification.data.NotificationRetention
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

/**
 * 기기에 오는 알림을 받아서, 사용자가 고른 앱의 알림 텍스트만 로컬 DB에 저장한다.
 *
 * 시스템이 직접 띄우는 서비스라서 앱 화면이 꺼져 있어도 동작한다.
 * 사용자가 설정 → 알림 접근 허용에서 말씨앗을 켜야 연결된다.
 */
class MessageNotificationListener : NotificationListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val appNameCache = ConcurrentHashMap<String, String>()

    private val monitoredApps by lazy { MonitoredAppsStore(this) }
    private val retention by lazy { NotificationRetention(this) }
    private val dao by lazy { NotificationDatabase.get(this).notificationDao() }

    override fun onListenerConnected() {
        super.onListenerConnected()
        // 권한을 켜기 전부터 알림창에 남아 있던 알림도 한 번 저장해 둔다 (이미 저장된 메시지는 중복으로 걸러짐).
        val active = runCatching { activeNotifications }.getOrNull() ?: return
        active.forEach(::handle)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn?.let(::handle)
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun handle(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
        if (!monitoredApps.isMonitored(sbn.packageName)) return

        val shortcut = conversationShortcutOf(sbn)
        val parsed = NotificationParser.parse(sbn, appNameOf(sbn.packageName), shortcut?.label)
        // 답장 화면의 "복사하고 메신저 열기"에서 그 대화방을 바로 열 수 있게 알림 동작을 기억해 둔다 (#69)
        sbn.notification.contentIntent?.let { intent ->
            parsed.map { it.conversationId }.distinct().forEach { id ->
                ConversationIntents.put(sbn.packageName, id, intent)
            }
        }
        // 보관 기간보다 오래된 메시지(알림창에 오래 남아 있던 알림 등)는 저장하지 않는다.
        val items = parsed.filterNot { retention.isExpired(it.messageTime) }
        if (items.isEmpty()) return

        scope.launch {
            runCatching { dao.insertAll(items).count { it != -1L } }
                .onSuccess { saved -> if (saved > 0) Log.d(TAG, "${sbn.packageName}: ${saved}건 저장") }
                .onFailure { Log.e(TAG, "알림 저장 실패", it) }
            runCatching { retention.purgeIfDue(dao) }
                .onFailure { Log.e(TAG, "보관 기간 정리 실패", it) }
        }
    }

    /**
     * 알림에 연결된 대화 바로가기 (Android 11+).
     * 카카오톡은 단톡방 이름을 알림 extras가 아니라 이 바로가기 이름으로만 넘긴다.
     * 시스템 알림창이 방 이름을 보여 주는 것도 이 값을 쓰기 때문이다.
     */
    private fun conversationShortcutOf(sbn: StatusBarNotification): ConversationShortcut? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return null
        return runCatching {
            val ranking = Ranking()
            if (!currentRanking.getRanking(sbn.key, ranking)) return@runCatching null
            ranking.conversationShortcutInfo?.let { info ->
                ConversationShortcut(
                    id = info.id,
                    shortLabel = info.shortLabel?.toString(),
                    longLabel = info.longLabel?.toString(),
                )
            }
        }.onFailure { Log.w(TAG, "대화 바로가기 조회 실패", it) }.getOrNull()
    }

    private fun appNameOf(pkg: String): String = appNameCache.getOrPut(pkg) {
        try {
            val info = packageManager.getApplicationInfo(pkg, 0)
            packageManager.getApplicationLabel(info).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            pkg
        }
    }

    companion object {
        private const val TAG = "MalssiatNotification"
    }
}
