// 알림을 모을 앱 목록 (#83)
// 알림 리스너(MessageNotificationListener.kt)는 이 목록에 있는 앱의 알림만 기기 DB에 저장함
// - 실제: Kotlin NotificationStore 모듈의 수집 앱 목록 (SharedPreferences, 기기 단위)
// - 네이티브 모듈이 없으면(Jest) 메모리 mock
// 목록은 OnboardingProvider가 로그인한 사용자의 연동 앱(05)에 맞춰 바꾸고, 로그아웃하면 비움
export interface CollectionService {
  getApps(): Promise<string[]>;
  setApps(packageNames: string[]): Promise<void>;
}

/** NotificationStore에서 쓰는 부분만 (테스트에서 가짜로 바꿀 수 있게) */
export interface CollectionNative {
  getMonitoredApps(): Promise<string[]>;
  setMonitoredApps(packageNames: string[]): Promise<void>;
}

export const createDeviceCollectionService = (
  native: CollectionNative
): CollectionService => ({
  getApps: () => native.getMonitoredApps(),
  setApps: packageNames => native.setMonitoredApps(packageNames),
});

export const createMockCollectionService = (
  initial: string[] = []
): CollectionService => {
  let apps = [...initial];
  return {
    async getApps() {
      return [...apps];
    },
    async setApps(packageNames) {
      apps = [...packageNames];
    },
  };
};
