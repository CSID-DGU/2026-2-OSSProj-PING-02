package com.malssiat.notification

import android.app.Notification
import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.malssiat.notification.data.MonitoredAppsStore
import com.malssiat.notification.data.NotificationDatabase
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
    private val db by lazy { NotificationDatabase.get(this) }
    private val dao by lazy { db.notificationDao() }

    override fun onListenerConnected() {
        super.onListenerConnected()
        // 권한을 켜기 전부터 알림창에 남아 있던 알림도 한 번 저장해 둔다.
        // 앱 업데이트·재부팅 때마다 다시 연결되므로, 원본 기록은 새로 온 알림에만 남긴다.
        val active = runCatching { activeNotifications }.getOrNull() ?: return
        active.forEach { handle(it, recordRaw = false) }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn?.let { handle(it, recordRaw = true) }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun handle(sbn: StatusBarNotification, recordRaw: Boolean) {
        if (sbn.packageName == packageName) return
        if (!monitoredApps.isMonitored(sbn.packageName)) return

        val appName = appNameOf(sbn.packageName)
        val shortcut = conversationShortcutOf(sbn)
        val items = NotificationParser.parse(sbn, appName, shortcut?.label)
        val shouldDump = recordRaw && monitoredApps.isRawDumpEnabled && !isGroupSummary(sbn)

        if (items.isEmpty() && !shouldDump) return

        scope.launch {
            // 메시지를 먼저 저장해야 "새로 저장된 건수"(중복 제외)를 원본에 함께 남길 수 있다.
            val savedCount = if (items.isEmpty()) 0 else {
                runCatching { dao.insertAll(items).count { it != -1L } }
                    .onFailure { Log.e(TAG, "알림 저장 실패", it) }
                    .getOrDefault(0)
            }
            if (savedCount > 0) Log.d(TAG, "${sbn.packageName}: ${savedCount}건 저장")

            // 테스트용 원본 기록. 묶음 요약("새 메시지 3개")은 내용이 없고 양만 많아서 남기지 않는다.
            if (shouldDump) {
                runCatching {
                    db.rawDumpDao().insert(
                        NotificationDumper.dump(sbn, appName, shortcut, items, savedCount)
                    )
                }.onFailure { Log.e(TAG, "원본 저장 실패", it) }
            }
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

    private fun isGroupSummary(sbn: StatusBarNotification): Boolean =
        sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0

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
