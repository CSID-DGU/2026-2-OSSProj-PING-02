package com.malssiat.notification.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * 알림 메시지를 담는 로컬 DB.
 *
 * TODO: 대화 원문이라 SQLCipher(net.zetetic:sqlcipher-android)로 암호화해야 한다.
 *       Room.databaseBuilder(...).openHelperFactory(SupportOpenHelperFactory(passphrase))만 붙이면 되고,
 *       passphrase는 Android Keystore로 감싸서 보관한다.
 */
@Database(
    entities = [NotificationEntity::class],
    version = 6,
    exportSchema = false,
)
abstract class NotificationDatabase : RoomDatabase() {

    abstract fun notificationDao(): NotificationDao

    companion object {
        private const val DB_NAME = "malssiat_notifications.db"

        /** v2: 테스트용 원본 수집 테이블 추가 (v6에서 다시 삭제) */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `raw_notification_dumps` (" +
                        "`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "`package_name` TEXT NOT NULL, " +
                        "`app_name` TEXT NOT NULL, " +
                        "`posted_at` INTEGER NOT NULL, " +
                        "`summary` TEXT NOT NULL, " +
                        "`json` TEXT NOT NULL, " +
                        "`saved_at` INTEGER NOT NULL)"
                )
            }
        }

        /**
         * v3: 대화방 ID(conversation_id)와 메시지 ID(message_id) 추가, 중복 판단 기준을 대화방 이름 → 대화방 ID로 변경.
         * 유니크 인덱스를 바꿔야 해서 테이블을 새로 만들고 옮긴다.
         * 기존 행은 대화방 ID를 알 수 없으므로 새 규칙의 이름 기반 ID("name:대화방 이름")를 넣는다.
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `notification_messages_new` (" +
                        "`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
                        "`package_name` TEXT NOT NULL, `app_name` TEXT NOT NULL, " +
                        "`conversation_id` TEXT NOT NULL, `conversation_title` TEXT NOT NULL, " +
                        "`sender` TEXT NOT NULL, `text` TEXT NOT NULL, `is_group` INTEGER NOT NULL, " +
                        "`message_time` INTEGER NOT NULL, `message_id` TEXT, " +
                        "`notification_key` TEXT NOT NULL, `saved_at` INTEGER NOT NULL)"
                )
                db.execSQL(
                    "INSERT OR IGNORE INTO `notification_messages_new` (" +
                        "id, package_name, app_name, conversation_id, conversation_title, sender, text, " +
                        "is_group, message_time, message_id, notification_key, saved_at) " +
                        "SELECT id, package_name, app_name, 'name:' || conversation_title, conversation_title, " +
                        "sender, text, " +
                        "is_group, message_time, NULL, notification_key, saved_at FROM `notification_messages`"
                )
                db.execSQL("DROP TABLE `notification_messages`")
                db.execSQL("ALTER TABLE `notification_messages_new` RENAME TO `notification_messages`")
                db.execSQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS `index_notification_messages_package_name_message_id` " +
                        "ON `notification_messages` (`package_name`, `message_id`)"
                )
                db.execSQL(
                    "CREATE UNIQUE INDEX IF NOT EXISTS " +
                        "`index_notification_messages_package_name_conversation_id_sender_text_message_time` " +
                        "ON `notification_messages` " +
                        "(`package_name`, `conversation_id`, `sender`, `text`, `message_time`)"
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_notification_messages_package_name_message_time` " +
                        "ON `notification_messages` (`package_name`, `message_time`)"
                )
            }
        }

        /** v4: 멘션 여부(is_mention)와 메시지 종류(content_type) 추가. 기존 행은 일반 텍스트로 본다 */
        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "ALTER TABLE `notification_messages` ADD COLUMN `is_mention` INTEGER NOT NULL DEFAULT 0"
                )
                db.execSQL(
                    "ALTER TABLE `notification_messages` ADD COLUMN `content_type` TEXT NOT NULL DEFAULT 'text'"
                )
            }
        }

        /**
         * v5: 보낸 사람 ID(sender_id, 친구 매칭용)와 안내 문구 여부(is_placeholder) 추가.
         * 기존 행 중 카카오톡 미리보기 꺼짐 문구·사진/이모티콘·인스타 공유 안내 문구는 안내 문구로 표시한다.
         */
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `notification_messages` ADD COLUMN `sender_id` TEXT")
                db.execSQL(
                    "ALTER TABLE `notification_messages` ADD COLUMN `is_placeholder` INTEGER NOT NULL DEFAULT 0"
                )
                db.execSQL(
                    "UPDATE `notification_messages` SET `is_placeholder` = 1 " +
                        "WHERE `text` = '새로운 메시지가 있습니다.' " +
                        "OR `text` IN ('사진을 보냈습니다.', '이모티콘을 보냈습니다.', '동영상을 보냈습니다.') " +
                        "OR `text` LIKE '회원님에게 %보냈습니다%'"
                )
            }
        }

        /** v6: 알림 형식 확인이 끝나서 테스트용 원본 기록 테이블 삭제 (대화 원문이 담겨 있으므로 남기지 않음) */
        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("DROP TABLE IF EXISTS `raw_notification_dumps`")
            }
        }

        @Volatile
        private var instance: NotificationDatabase? = null

        fun get(context: Context): NotificationDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    NotificationDatabase::class.java,
                    DB_NAME,
                ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6).build().also { instance = it }
            }
    }
}
