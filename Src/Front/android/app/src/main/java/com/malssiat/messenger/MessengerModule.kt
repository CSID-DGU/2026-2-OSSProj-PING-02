package com.malssiat.messenger

import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Telephony
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.malssiat.notification.ConversationIntents

/**
 * 답장 화면의 "복사하고 메신저 열기"에 쓰는 네이티브 모듈 (#69).
 * JS 쪽 사용법은 src/native/Messenger.ts 참고.
 * 복사한 답장과 메시지 내용은 로그에 남기지 않는다.
 */
class MessengerModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    /** 답장을 클립보드에 복사한다 */
    @ReactMethod
    fun copyText(text: String, promise: Promise) {
        runCatching {
            val clipboard = reactContext.getSystemService(ClipboardManager::class.java)
                ?: error("clipboard unavailable")
            clipboard.setPrimaryClip(ClipData.newPlainText(CLIP_LABEL, text))
        }
            .onSuccess { promise.resolve(null) }
            .onFailure { promise.reject(E_COPY_FAILED, "복사하지 못했습니다.") }
    }

    /**
     * 앱 첫 화면을 연다. 설치되지 않았거나 열 수 있는 화면이 없으면 E_APP_NOT_INSTALLED.
     * 런처 앱 목록은 AndroidManifest의 <queries>(MAIN/LAUNCHER)로 보이게 해 두었다.
     */
    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        val intent = reactContext.packageManager.getLaunchIntentForPackage(packageName)
        if (intent == null) {
            promise.reject(E_APP_NOT_INSTALLED, "앱을 찾을 수 없습니다.")
            return
        }
        runCatching { startActivity(intent) }
            .onSuccess { promise.resolve(null) }
            .onFailure { promise.reject(E_APP_NOT_INSTALLED, "앱을 열 수 없습니다.") }
    }

    /**
     * 알림에 담겨 있던 동작으로 그 대화방을 연다.
     * 열었으면 true, 기억해 둔 동작이 없거나 메신저가 취소했으면 false (JS가 openApp으로 첫 화면을 연다).
     */
    @ReactMethod
    fun openConversation(packageName: String, conversationId: String, promise: Promise) {
        val pending = ConversationIntents.get(packageName, conversationId)
        if (pending == null) {
            promise.resolve(false)
            return
        }
        try {
            sendFromForeground(pending)
            promise.resolve(true)
        } catch (e: PendingIntent.CanceledException) {
            ConversationIntents.remove(packageName, conversationId)
            promise.resolve(false)
        } catch (e: RuntimeException) {
            promise.resolve(false)
        }
    }

    /** 기기의 기본 문자 앱 패키지 (없으면 null) */
    @ReactMethod
    fun getDefaultSmsPackage(promise: Promise) {
        promise.resolve(runCatching { Telephony.Sms.getDefaultSmsPackage(reactContext) }.getOrNull())
    }

    private fun startActivity(intent: Intent) {
        val activity = reactContext.currentActivity
        if (activity != null) {
            activity.startActivity(intent)
        } else {
            reactContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    /**
     * 다른 앱이 만든 PendingIntent로 화면을 열 때, Android 14(API 34)부터는 보내는 쪽(지금 화면에 보이는 말씨앗)이
     * 화면 열기를 허락한다고 옵션으로 밝혀야 한다. 사용자가 버튼을 누른 순간에만 부른다.
     */
    private fun sendFromForeground(pending: PendingIntent) {
        val options: Bundle? = when {
            Build.VERSION.SDK_INT >= 36 -> ActivityOptions.makeBasic()
                .setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE,
                )
                .toBundle()
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE -> ActivityOptions.makeBasic()
                .setPendingIntentBackgroundActivityStartMode(
                    @Suppress("DEPRECATION") ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED,
                )
                .toBundle()
            else -> null
        }
        pending.send(reactContext, 0, null, null, null, null, options)
    }

    companion object {
        const val NAME = "Messenger"
        private const val CLIP_LABEL = "말씨앗 답장"
        private const val E_COPY_FAILED = "COPY_FAILED"
        private const val E_APP_NOT_INSTALLED = "APP_NOT_INSTALLED"
    }
}
