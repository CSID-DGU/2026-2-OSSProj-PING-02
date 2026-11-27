import { NativeModules } from "react-native";

// Kotlin 네이티브 모듈 래퍼 (#70 기기 연락처 읽기)
// 구현: android/app/src/main/java/com/malssiat/contacts/ContactsModule.kt
// 이름·전화번호는 기기 안에서만 쓰고 서버로 보내지 않음

export interface NativeContact {
  id: string;
  name: string;
  phone: string;
}

export interface ContactsNative {
  /** 전화번호가 있는 연락처 (가나다순). READ_CONTACTS 권한이 없으면 code "E_PERMISSION" */
  getAll(): Promise<NativeContact[]>;
}

const native = NativeModules.Contacts as ContactsNative | undefined;

/** 네이티브 모듈이 있는지 (Jest·옛 빌드에는 없음) */
export const isContactsAvailable = () => native != null;

const Contacts: ContactsNative = {
  getAll: () => {
    if (!native) {
      return Promise.reject(
        new Error("Contacts 네이티브 모듈이 없습니다. `yarn android`로 앱을 다시 빌드하세요.")
      );
    }
    return native.getAll();
  },
};

export default Contacts;
