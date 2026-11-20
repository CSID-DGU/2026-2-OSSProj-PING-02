package com.malssiat.notification.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 테스트용: 알림 원본을 통째로 JSON으로 남긴 기록.
 *
 * 앱마다 알림 형식이 달라서, 실제 기기에서 어떤 값이 오는지 확인하고 파서를 맞추는 데 쓴다.
 * 설정에서 "원본 수집"을 켰을 때만 쌓인다.
 */
@Entity(tableName = "raw_notification_dumps")
data class RawNotificationDump(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "package_name")
    val packageName: String,

    @ColumnInfo(name = "app_name")
    val appName: String,

    /** 알림이 게시된 시각 (epoch ms) */
    @ColumnInfo(name = "posted_at")
    val postedAt: Long,

    /** 목록에 보여 줄 한 줄 요약 (제목: 본문) */
    @ColumnInfo(name = "summary")
    val summary: String,

    /** 알림 원본 전체 (JSON 문자열) */
    @ColumnInfo(name = "json")
    val json: String,

    @ColumnInfo(name = "saved_at")
    val savedAt: Long = System.currentTimeMillis(),
)
