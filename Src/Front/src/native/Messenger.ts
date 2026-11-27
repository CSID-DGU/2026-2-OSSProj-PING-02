import { NativeModules } from "react-native";

// Kotlin 네이티브 모듈 래퍼 (#69 복사하고 메신저 열기)
// 구현: android/app/src/main/java/com/malssiat/messenger/MessengerModule.kt

export interface MessengerNative {
  /** 클립보드에 복사. 실패하면 code "COPY_FAILED" */
  copyText(text: string): Promise<void>;
  /** 앱 첫 화면 열기. 설치되지 않았으면 code "APP_NOT_INSTALLED" */
  openApp(packageName: string): Promise<void>;
  /**
   * 알림에 담겨 있던 동작으로 그 대화방 열기. 열었으면 true
   * 기억해 둔 동작이 없으면(알림을 받은 뒤 앱이 다시 시작됨 등) false
   */
  openConversation(packageName: string, conversationId: string): Promise<boolean>;
  /** 기기의 기본 문자 앱 패키지 (없으면 null) */
  getDefaultSmsPackage(): Promise<string | null>;
}

const native = NativeModules.Messenger as MessengerNative | undefined;

/** 네이티브 모듈이 있는지 (Jest·옛 빌드에는 없음) */
export const isMessengerAvailable = () => native != null;

const getNative = (): MessengerNative => {
  if (!native) {
    throw new Error(
      "Messenger 네이티브 모듈이 없습니다. `yarn android`로 앱을 다시 빌드하세요."
    );
  }
  return native;
};

const Messenger: MessengerNative = {
  copyText: text => getNative().copyText(text),
  openApp: packageName => getNative().openApp(packageName),
  openConversation: (packageName, conversationId) =>
    getNative().openConversation(packageName, conversationId),
  getDefaultSmsPackage: () => getNative().getDefaultSmsPackage(),
};

export default Messenger;
