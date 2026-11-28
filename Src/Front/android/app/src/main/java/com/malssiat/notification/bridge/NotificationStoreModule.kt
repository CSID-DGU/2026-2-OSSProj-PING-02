package com.malssiat.notification.bridge

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.malssiat.notification.MessageNotificationListener
import com.malssiat.notification.NotificationEvents
import com.malssiat.notification.data.MonitoredAppsStore
import com.malssiat.notification.data.NotificationDatabase
import com.malssiat.notification.data.NotificationEntity
import com.malssiat.notification.data.NotificationRetention
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * JS에서 알림 수집 기능을 다루는 네이티브 모듈.
 * JS 쪽 사용법은 src/native/NotificationStore.ts 참고.
 */
class NotificationStoreModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val monitoredApps = MonitoredAppsStore(reactContext)
    private val retention = NotificationRetention(reactContext)
    private val dao by lazy { NotificationDatabase.get(reactContext).notificationDao() }

    // 새 메시지가 저장되면 JS에 이벤트를 보낸다 (#71). 내용 없이 신호만
    private val onSaved: () -> Unit = {
        if (reactContext.hasActiveReactInstance()) {
            reactContext.emitDeviceEvent(EVENT_SAVED, null)
        }
    }

    init {
        NotificationEvents.addListener(onSaved)
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        NotificationEvents.removeListener(onSaved)
        scope.cancel()
        super.invalidate()
    }

    /** 설정 → 알림 접근 허용에서 말씨앗이 켜져 있는지 */
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        val granted = NotificationManagerCompat.getEnabledListenerPackages(reactContext)
            .contains(reactContext.packageName)
        promise.resolve(granted)
    }

    /** 알림 접근 허용 설정 화면을 연다. Android 11 이상은 말씨앗 항목으로 바로 이동한다. */
    @ReactMethod
    fun openPermissionSettings(promise: Promise) {
        val detailIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                ComponentName(reactContext, MessageNotificationListener::class.java).flattenToString(),
            )
        } else {
            null
        }
        val listIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)

        val opened = listOfNotNull(detailIntent, listIntent).any { intent ->
            runCatching {
                reactContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }.isSuccess
        }
        if (opened) promise.resolve(null)
        else promise.reject("E_SETTINGS", "알림 접근 설정 화면을 열 수 없습니다.")
    }

    /** 런처에 보이는 앱 목록 (알림 저장 대상 선택용) */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        scope.launch {
            runCatching {
                val pm = reactContext.packageManager
                val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                val apps = pm.queryIntentActivities(launcherIntent, 0)
                    .map { it.activityInfo.applicationInfo }
                    .distinctBy { it.packageName }
                    .filter { it.packageName != reactContext.packageName }
                    .map { it.packageName to pm.getApplicationLabel(it).toString() }
                    .sortedBy { it.second }

                Arguments.createArray().apply {
                    apps.forEach { (pkg, label) ->
                        pushMap(Arguments.createMap().apply {
                            putString("packageName", pkg)
                            putString("appName", label)
                        })
                    }
                }
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_APPS", it) }
        }
    }

    @ReactMethod
    fun getMonitoredApps(promise: Promise) {
        promise.resolve(Arguments.fromList(monitoredApps.getAll().sorted()))
    }

    @ReactMethod
    fun setMonitoredApps(packageNames: ReadableArray, promise: Promise) {
        val list = (0 until packageNames.size()).mapNotNull { packageNames.getString(it) }
        monitoredApps.setAll(list)
        promise.resolve(null)
    }

    /** 저장된 알림 메시지를 최신순으로. packageName이 null이면 전체 앱 */
    @ReactMethod
    fun getNotifications(packageName: String?, limit: Double, promise: Promise) {
        scope.launch {
            runCatching {
                retention.purgeIfDue(dao)
                val n = limit.toInt().coerceIn(1, MAX_LIMIT)
                val rows = if (packageName == null) dao.getRecent(n)
                else dao.getRecentByPackage(packageName, n)
                Arguments.createArray().apply { rows.forEach { pushMap(it.toWritableMap()) } }
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    /** 한 대화방의 최근 메시지를 최신순으로 */
    @ReactMethod
    fun getConversationMessages(packageName: String, conversationId: String, limit: Double, promise: Promise) {
        scope.launch {
            runCatching {
                retention.purgeIfDue(dao)
                val rows = dao.getRecentByConversation(packageName, conversationId, limit.toInt().coerceIn(1, MAX_LIMIT))
                Arguments.createArray().apply { rows.forEach { pushMap(it.toWritableMap()) } }
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    /** 저장된 알림을 지운다. packageName이 null이면 전체. 지운 개수를 돌려준다 */
    @ReactMethod
    fun clearNotifications(packageName: String?, promise: Promise) {
        scope.launch {
            runCatching {
                if (packageName == null) dao.deleteAll() else dao.deleteByPackage(packageName)
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    /**
     * 수집 원문 보관 상태 (설정 H07): 원문 개수, 주기(일), 마지막·다음 전체 삭제 시각.
     * 주기가 지났으면 먼저 지우고 돌려준다
     */
    @ReactMethod
    fun getRetentionInfo(promise: Promise) {
        scope.launch {
            runCatching {
                retention.purgeIfDue(dao)
                retentionInfoMap()
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    /** 첫 주기의 시작을 가입일로 (아직 한 번도 전체 삭제를 안 했을 때만). 보관 상태를 돌려준다 */
    @ReactMethod
    fun startRetentionCycle(startAt: Double, promise: Promise) {
        scope.launch {
            runCatching {
                retention.startCycleIfFirst(startAt.toLong(), dao)
                retentionInfoMap()
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    /**
     * 원문 전체를 지금 지운다. resetCycle이 false면 이 시각부터 주기를 다시 세고(H07 "지금 바로 삭제"),
     * true면 주기 기록도 처음으로(회원 탈퇴). 지운 개수를 돌려준다
     */
    @ReactMethod
    fun deleteAllNotificationsNow(resetCycle: Boolean, promise: Promise) {
        scope.launch {
            runCatching {
                if (resetCycle) retention.reset(dao) else retention.deleteAllNow(dao)
            }.onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    private suspend fun retentionInfoMap(): WritableMap {
        val info = retention.info()
        return Arguments.createMap().apply {
            putInt("count", dao.count())
            putInt("days", info.days)
            putDouble("cycleStartAt", info.cycleStartAt.toDouble())
            info.lastFullDeleteAt?.let { putDouble("lastFullDeleteAt", it.toDouble()) }
                ?: putNull("lastFullDeleteAt")
            putDouble("nextFullDeleteAt", info.nextFullDeleteAt.toDouble())
        }
    }

    /** 메시지 보관 주기(일) */
    @ReactMethod
    fun getRetentionDays(promise: Promise) {
        promise.resolve(retention.getDays())
    }

    /** 보관 주기를 바꾸고 주기가 지났으면 바로 지운다. 지운 개수를 돌려준다 */
    @ReactMethod
    fun setRetentionDays(days: Double, promise: Promise) {
        scope.launch {
            runCatching { retention.setDays(days.toInt(), dao) }
                .onSuccess(promise::resolve)
                .onFailure { promise.reject("E_DB", it) }
        }
    }

    private fun NotificationEntity.toWritableMap(): WritableMap = Arguments.createMap().apply {
        // JS number는 double이라 id·시각도 double로 넘긴다 (2^53 이하라 손실 없음).
        putDouble("id", id.toDouble())
        putString("packageName", packageName)
        putString("appName", appName)
        putString("conversationId", conversationId)
        putString("conversationTitle", conversationTitle)
        putString("messageId", messageId)
        putBoolean("isMention", isMention)
        putString("contentType", contentType)
        putString("senderId", senderId)
        putBoolean("isPlaceholder", isPlaceholder)
        putString("sender", sender)
        putString("text", text)
        putBoolean("isGroupConversation", isGroupConversation)
        putDouble("messageTime", messageTime.toDouble())
        putDouble("savedAt", savedAt.toDouble())
    }

    companion object {
        const val NAME = "NotificationStore"
        /** JS: DeviceEventEmitter.addListener("malssiat.notificationsSaved", ...) (src/native/NotificationStore.ts) */
        const val EVENT_SAVED = "malssiat.notificationsSaved"
        private const val MAX_LIMIT = 1000
    }
}
