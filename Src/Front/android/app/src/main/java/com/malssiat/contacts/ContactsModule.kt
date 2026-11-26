package com.malssiat.contacts

import android.Manifest
import android.content.pm.PackageManager
import android.provider.ContactsContract.CommonDataKinds.Phone
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * 기기 연락처를 읽는 네이티브 모듈 (#70). JS 쪽 사용법은 src/native/Contacts.ts 참고.
 *
 * - 연락처 id, 이름, 전화번호만 읽는다 (이메일·사진·메모 등은 읽지 않음).
 * - 읽은 값은 JS로만 넘기고 기기 밖으로 보내지 않는다. 로그에도 남기지 않는다.
 * - READ_CONTACTS 권한은 JS(PermissionsAndroid)가 요청한다. 권한이 없으면 E_PERMISSION.
 */
class ContactsModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = NAME

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }

    /** 전화번호가 있는 연락처 [{ id, name, phone }] (가나다순). 한 사람에 번호가 여러 개면 대표 번호, 없으면 첫 번호 */
    @ReactMethod
    fun getAll(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_CONTACTS) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) {
            promise.reject(E_PERMISSION, "연락처 권한이 없습니다.")
            return
        }
        scope.launch {
            runCatching { readContacts() }
                .onSuccess { contacts ->
                    promise.resolve(Arguments.createArray().apply {
                        contacts.forEach { c ->
                            pushMap(Arguments.createMap().apply {
                                putString("id", c.id)
                                putString("name", c.name)
                                putString("phone", c.phone)
                            })
                        }
                    })
                }
                // 오류 내용에 연락처 값이 섞이지 않게 원인은 넘기지 않는다
                .onFailure { promise.reject(E_READ, "연락처를 읽지 못했습니다.") }
        }
    }

    private data class Row(val id: String, val name: String, val phone: String)

    private fun readContacts(): List<Row> {
        val projection = arrayOf(
            Phone.CONTACT_ID,
            Phone.DISPLAY_NAME_PRIMARY,
            Phone.NUMBER,
            Phone.IS_SUPER_PRIMARY,
        )
        // 같은 사람의 번호는 대표 번호가 먼저 오게
        val order = "${Phone.DISPLAY_NAME_PRIMARY} COLLATE LOCALIZED ASC, ${Phone.CONTACT_ID} ASC, " +
            "${Phone.IS_SUPER_PRIMARY} DESC"
        val byId = LinkedHashMap<String, Row>()
        reactContext.contentResolver.query(Phone.CONTENT_URI, projection, null, null, order)?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(Phone.CONTACT_ID)
            val nameCol = cursor.getColumnIndexOrThrow(Phone.DISPLAY_NAME_PRIMARY)
            val numberCol = cursor.getColumnIndexOrThrow(Phone.NUMBER)
            while (cursor.moveToNext()) {
                val id = cursor.getString(idCol) ?: continue
                if (byId.containsKey(id)) continue
                val phone = cursor.getString(numberCol)?.trim().orEmpty()
                if (phone.isEmpty()) continue
                // 이름 없이 번호만 저장된 연락처는 번호를 이름으로
                val name = cursor.getString(nameCol)?.trim().takeUnless { it.isNullOrEmpty() } ?: phone
                byId[id] = Row(id, name, phone)
            }
        }
        return byId.values.toList()
    }

    companion object {
        const val NAME = "Contacts"
        private const val E_PERMISSION = "E_PERMISSION"
        private const val E_READ = "E_READ"
    }
}
