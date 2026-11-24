package com.malssiat.notification.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface NotificationDao {

    /** 이미 저장된 메시지(유니크 인덱스 충돌)는 건너뛴다. 새로 들어간 행만 id가 -1이 아니다. */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(items: List<NotificationEntity>): List<Long>

    @Query("SELECT * FROM notification_messages ORDER BY message_time DESC LIMIT :limit")
    suspend fun getRecent(limit: Int): List<NotificationEntity>

    @Query(
        "SELECT * FROM notification_messages WHERE package_name = :packageName " +
            "ORDER BY message_time DESC LIMIT :limit"
    )
    suspend fun getRecentByPackage(packageName: String, limit: Int): List<NotificationEntity>

    /** 한 대화방의 최근 메시지 (최신순). 대화방 ID는 앱마다 겹칠 수 있어 앱도 함께 본다 */
    @Query(
        "SELECT * FROM notification_messages WHERE package_name = :packageName AND conversation_id = :conversationId " +
            "ORDER BY message_time DESC, id DESC LIMIT :limit"
    )
    suspend fun getRecentByConversation(
        packageName: String,
        conversationId: String,
        limit: Int,
    ): List<NotificationEntity>

    @Query("SELECT COUNT(*) FROM notification_messages")
    suspend fun count(): Int

    @Query("DELETE FROM notification_messages WHERE package_name = :packageName")
    suspend fun deleteByPackage(packageName: String): Int

    @Query("DELETE FROM notification_messages")
    suspend fun deleteAll(): Int

    /** 메시지 시각이 cutoff보다 오래된 행을 지운다 (보관 기간 정리, NotificationRetention) */
    @Query("DELETE FROM notification_messages WHERE message_time < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long): Int
}
