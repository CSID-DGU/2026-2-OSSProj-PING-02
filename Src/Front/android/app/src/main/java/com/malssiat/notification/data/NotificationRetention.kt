package com.malssiat.notification.data

import android.content.Context
import android.util.Log

/**
 * 저장된 알림 원문의 보관 주기: **주기(기본 30일)마다 원문 전체를 지운다** (#60 설정 H07 "수집 원문 전체 캐시").
 *
 * - 주기의 시작: 처음에는 가입일([startCycleIfFirst], JS가 GET /users/me의 createdAt으로 알려 줌).
 *   아직 알려 주지 않았으면 이 기기에서 처음 쓴 때.
 * - 시작 + 주기가 지나면 그때까지 저장된 원문을 모두 지우고, 지운 시각(경계)부터 다음 주기를 센다.
 *   여러 주기를 건너뛰었으면(앱을 오래 안 켬) 가장 최근 경계로 맞춘다.
 * - 사용자가 "지금 바로 삭제"하면([deleteAllNow]) 그 시각부터 주기를 다시 센다 (Figma H07 삭제 완료 화면, 팀 확정).
 * - 마지막 전체 삭제 시각보다 오래된 메시지는 처음부터 저장하지 않는다 ([isExpired], 이미 지운 원문이 다시 쌓이지 않게).
 * - 새 알림을 저장할 때와 앱이 메시지를 읽을 때 [purgeIfDue]를 부르고, 확인은 [PURGE_INTERVAL_MS]에 한 번만 한다.
 *
 * TODO(팀 결정): 기본 주기. 지금은 30일 (설정 화면에서 바꿀 수 있게 브리지로 열어 둠)
 */
class NotificationRetention(context: Context) {

    private val prefs = context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** 주기 상태 (화면 표시용) */
    data class Info(
        val days: Int,
        val cycleStartAt: Long,
        val lastFullDeleteAt: Long?, // 아직 한 번도 지우지 않았으면 null
        val nextFullDeleteAt: Long,
    )

    fun getDays(): Int = clampDays(prefs.getInt(KEY_DAYS, DEFAULT_DAYS))

    fun info(now: Long = System.currentTimeMillis()): Info {
        val start = cycleStart(now)
        return Info(
            days = getDays(),
            cycleStartAt = start,
            lastFullDeleteAt = prefs.getLong(KEY_LAST_FULL_DELETE_AT, 0L).takeIf { it > 0L },
            nextFullDeleteAt = start + getDays() * DAY_MS,
        )
    }

    /** 주기를 바꾸고 바로 확인한다 (지난 주기면 지움). 지운 개수를 돌려준다 */
    suspend fun setDays(days: Int, dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        prefs.edit().putInt(KEY_DAYS, clampDays(days)).apply()
        return purge(dao, now)
    }

    /**
     * 첫 주기의 시작을 가입일로 맞춘다. 아직 한 번도 전체 삭제를 하지 않았을 때만 바꾼다
     * (지운 뒤에는 그 시각부터 센 주기를 유지). 미래 시각이면 지금으로.
     */
    suspend fun startCycleIfFirst(startAt: Long, dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        if (prefs.getLong(KEY_LAST_FULL_DELETE_AT, 0L) > 0L) return 0
        prefs.edit().putLong(KEY_CYCLE_START_AT, minOf(startAt, now)).apply()
        return purge(dao, now)
    }

    fun isExpired(messageTime: Long): Boolean =
        messageTime < prefs.getLong(KEY_LAST_FULL_DELETE_AT, 0L)

    /** 마지막 확인 뒤 [PURGE_INTERVAL_MS]가 지났으면 주기가 끝났는지 보고 지운다. 지운 개수를 돌려준다 */
    suspend fun purgeIfDue(dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        if (!isPurgeDue(prefs.getLong(KEY_LAST_PURGE_AT, 0L), now)) return 0
        return purge(dao, now)
    }

    /** 사용자가 지금 바로 전체 삭제: 원문을 모두 지우고 이 시각부터 주기를 다시 센다. 지운 개수를 돌려준다 */
    suspend fun deleteAllNow(dao: NotificationDao, now: Long = System.currentTimeMillis()): Int {
        val deleted = dao.deleteAll()
        prefs.edit()
            .putLong(KEY_CYCLE_START_AT, now)
            .putLong(KEY_LAST_FULL_DELETE_AT, now)
            .putLong(KEY_LAST_PURGE_AT, now)
            .apply()
        return deleted
    }

    /** 회원 탈퇴 등: 원문을 모두 지우고 주기 기록도 처음으로 (다음 사용자는 자기 가입일부터) */
    suspend fun reset(dao: NotificationDao): Int {
        val deleted = dao.deleteAll()
        prefs.edit()
            .remove(KEY_CYCLE_START_AT)
            .remove(KEY_LAST_FULL_DELETE_AT)
            .remove(KEY_LAST_PURGE_AT)
            .apply()
        return deleted
    }

    private suspend fun purge(dao: NotificationDao, now: Long): Int {
        val start = cycleStart(now)
        val boundary = lastBoundary(start, getDays(), now)
        var deleted = 0
        if (boundary != null) {
            // 경계 전에 저장된 원문을 모두 지움 (경계는 지금 이전이라 사실상 전체)
            deleted = dao.deleteSavedBefore(boundary)
            prefs.edit()
                .putLong(KEY_CYCLE_START_AT, boundary)
                .putLong(KEY_LAST_FULL_DELETE_AT, boundary)
                .apply()
            Log.d(TAG, "보관 주기가 지나 원문 ${deleted}건 삭제")
        }
        prefs.edit().putLong(KEY_LAST_PURGE_AT, now).apply()
        return deleted
    }

    /** 주기 시작. 처음 부를 때 없으면 지금으로 정해 저장 */
    private fun cycleStart(now: Long): Long {
        val saved = prefs.getLong(KEY_CYCLE_START_AT, 0L)
        if (saved > 0L) return saved
        prefs.edit().putLong(KEY_CYCLE_START_AT, now).apply()
        return now
    }

    companion object {
        private const val TAG = "MalssiatNotification"
        private const val PREFS_NAME = "malssiat_notification_prefs"
        private const val KEY_DAYS = "retention_days"
        private const val KEY_LAST_PURGE_AT = "retention_last_purge_at"
        private const val KEY_CYCLE_START_AT = "retention_cycle_start_at"
        private const val KEY_LAST_FULL_DELETE_AT = "retention_last_full_delete_at"

        const val DEFAULT_DAYS = 30
        const val MIN_DAYS = 1
        const val MAX_DAYS = 365
        const val DAY_MS = 24L * 60 * 60 * 1000
        const val PURGE_INTERVAL_MS = 60L * 60 * 1000

        fun clampDays(days: Int): Int = days.coerceIn(MIN_DAYS, MAX_DAYS)

        /**
         * 지금까지 지난 가장 최근 주기 경계 (시작 + 주기 × n ≤ now). 아직 첫 주기 안이면 null.
         * 앱을 여러 주기 동안 안 켰어도 경계는 하나로 맞춘다.
         */
        fun lastBoundary(cycleStartAt: Long, days: Int, now: Long): Long? {
            val period = clampDays(days) * DAY_MS
            if (now - cycleStartAt < period) return null
            return cycleStartAt + (now - cycleStartAt) / period * period
        }

        /** 시계를 뒤로 돌린 경우(lastPurgeAt이 미래)에도 다시 확인한다 */
        fun isPurgeDue(lastPurgeAt: Long, now: Long): Boolean =
            now < lastPurgeAt || now - lastPurgeAt >= PURGE_INTERVAL_MS
    }
}
