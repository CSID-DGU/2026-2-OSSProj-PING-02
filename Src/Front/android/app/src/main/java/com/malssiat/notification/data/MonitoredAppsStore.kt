package com.malssiat.notification.data

import android.content.Context

/**
 * 사용자가 알림 저장 대상으로 고른 앱 패키지 목록.
 *
 * 알림이 올 때마다 읽히므로 DB 대신 SharedPreferences에 둔다.
 */
class MonitoredAppsStore(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getAll(): Set<String> = prefs.getStringSet(KEY_PACKAGES, emptySet()).orEmpty().toSet()

    fun isMonitored(packageName: String): Boolean = packageName in getAll()

    fun setAll(packageNames: Collection<String>) {
        // getStringSet이 돌려준 Set을 그대로 수정하면 저장되지 않으므로 항상 새 Set으로 넣는다.
        prefs.edit().putStringSet(KEY_PACKAGES, packageNames.toSet()).apply()
    }

    companion object {
        private const val PREFS_NAME = "malssiat_notification_prefs"
        private const val KEY_PACKAGES = "monitored_packages"
    }
}
