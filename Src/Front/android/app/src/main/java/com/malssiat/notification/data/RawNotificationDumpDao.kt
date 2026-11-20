package com.malssiat.notification.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface RawNotificationDumpDao {

    @Insert
    suspend fun insert(item: RawNotificationDump): Long

    @Query("SELECT * FROM raw_notification_dumps ORDER BY posted_at DESC, id DESC LIMIT :limit")
    suspend fun getRecent(limit: Int): List<RawNotificationDump>

    @Query(
        "SELECT * FROM raw_notification_dumps WHERE package_name = :packageName " +
            "ORDER BY posted_at DESC, id DESC LIMIT :limit"
    )
    suspend fun getRecentByPackage(packageName: String, limit: Int): List<RawNotificationDump>

    @Query("DELETE FROM raw_notification_dumps")
    suspend fun deleteAll(): Int
}
