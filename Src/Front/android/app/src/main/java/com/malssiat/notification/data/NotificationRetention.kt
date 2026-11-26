package com.malssiat.notification.data

import android.content.Context
import android.util.Log

/**
 * 저장된 알림 메시지의 보관 기간.
 *
 * 대화 원문을 기기에 무기한 쌓아 두지 않도록, 메시지 시각(message_time)이 보관 기간보다 오래된 행은 지운다.
 * - 새 알림을 저장할 때와 앱이 저장된 메시지를 읽을 때 [purgeIfDue]를 부르고, 실제 삭제는 [PURGE_INTERVAL_MS]에 한 번만 한다.
 * - 보관 기간보다 이미 오래된 알림은 처음부터 저장하지 않는다 ([isExpired]).
 * - 보관 기간을 줄이면 바로 지운다 ([setDays]).
 *
 * TODO(팀 결정): 기본 보관 기간. 지금은 30일 (설정 화면에서 바꿀 수 있게 브리지로 열어 둠)
 */
class NotificationRetention(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getDays(): Int = clampDays(prefs.getInt(KEY_DAYS, DEFAULT_DAYS))

    /** 보관 기간을 바꾸고 바로 정리한다. 지운 개수를 돌려준다 */
    suspend fun setDays(days: Int, dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        prefs.edit().putInt(KEY_DAYS, clampDays(days)).apply()
        return purge(dao, now)
    }

    fun isExpired(messageTime: Long, now: Long = System.currentTimeMillis()): Boolean =
        messageTime < cutoffOf(now, getDays())

    /** 마지막 정리 뒤 [PURGE_INTERVAL_MS]가 지났으면 오래된 메시지를 지운다. 지운 개수를 돌려준다 */
    suspend fun purgeIfDue(dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        if (!isPurgeDue(prefs.getLong(KEY_LAST_PURGE_AT, 0L), now)) return 0
        return purge(dao, now)
    }

    private suspend fun purge(dao: NotificationDao, now: Long): Int {
        val deleted = dao.deleteOlderThan(cutoffOf(now, getDays()))
        prefs.edit().putLong(KEY_LAST_PURGE_AT, now).apply()
        if (deleted > 0) Log.d(TAG, "보관 기간이 지난 메시지 ${deleted}건 삭제")
        return deleted
    }

    companion object {
        private const val TAG = "MalssiatNotification"
        private const val PREFS_NAME = "malssiat_notification_prefs"
        private const val KEY_DAYS = "retention_days"
        private const val KEY_LAST_PURGE_AT = "retention_last_purge_at"

        const val DEFAULT_DAYS = 30
        const val MIN_DAYS = 1
        const val MAX_DAYS = 365
        const val DAY_MS = 24L * 60 * 60 * 1000
        const val PURGE_INTERVAL_MS = 60L * 60 * 1000

        fun clampDays(days: Int): Int = days.coerceIn(MIN_DAYS, MAX_DAYS)

        /** 이 시각보다 오래된 메시지는 보관 기간이 지난 것 */
        fun cutoffOf(now: Long, days: Int): Long = now - clampDays(days) * DAY_MS

        /** 시계를 뒤로 돌린 경우(lastPurgeAt이 미래)에도 다시 정리한다 */
        fun isPurgeDue(lastPurgeAt: Long, now: Long): Boolean =
            now < lastPurgeAt || now - lastPurgeAt >= PURGE_INTERVAL_MS
    }
}
