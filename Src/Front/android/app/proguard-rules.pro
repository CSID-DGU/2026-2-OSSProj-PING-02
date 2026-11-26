# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# SQLCipher (알림 DB 암호화): 네이티브 코드가 자바 클래스를 이름으로 찾으므로 유지
-keep class net.zetetic.database.** { *; }
-keep class androidx.sqlite.** { *; }
