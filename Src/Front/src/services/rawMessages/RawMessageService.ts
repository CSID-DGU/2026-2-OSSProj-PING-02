import type { RetentionInfo } from "../../native/NotificationStore";

// 알림으로 모은 대화 원문의 보관 (설정 H07 "수집 원문 전체 캐시")
// - 주기(기본 30일)가 끝날 때마다 원문 전체를 지움. 첫 주기는 가입일부터 (#60 팀 확정)
// - "지금 바로 삭제"하면 그 시각부터 주기를 다시 셈 (Figma H07 삭제 완료 화면)
// 실제 삭제는 Kotlin(NotificationRetention)이 하고, 여기서는 상태를 읽고 요청만 보냄
export type { RetentionInfo };

export interface RawMessageService {
  /** 원문 개수·마지막/다음 전체 삭제 시각 (주기가 지났으면 먼저 지운 뒤의 값) */
  getInfo(): Promise<RetentionInfo>;
  /** 첫 주기의 시작을 가입일로 (아직 한 번도 전체 삭제를 안 했을 때만 바뀜) */
  startCycle(startAt: number): Promise<void>;
  /** 지금 전체 삭제하고 이 시각부터 주기를 다시 셈. 지운 개수 */
  deleteAllNow(): Promise<number>;
  /** 회원 탈퇴: 전체 삭제 + 주기 기록도 처음으로 */
  reset(): Promise<void>;
}

/** NotificationStore에서 쓰는 부분만 (테스트에서 가짜로 바꿀 수 있게) */
export interface RawMessageNative {
  getRetentionInfo(): Promise<RetentionInfo>;
  startRetentionCycle(startAt: number): Promise<RetentionInfo>;
  deleteAllNow(resetCycle?: boolean): Promise<number>;
}

export const createDeviceRawMessageService = (
  native: RawMessageNative
): RawMessageService => ({
  getInfo: () => native.getRetentionInfo(),
  startCycle: async startAt => {
    await native.startRetentionCycle(startAt);
  },
  deleteAllNow: () => native.deleteAllNow(false),
  reset: async () => {
    await native.deleteAllNow(true);
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;

interface MockOptions {
  /** 저장된 원문 수 (시안 H07 예시 128건) */
  count?: number;
  days?: number;
  now?: () => number;
}

// 네이티브 모듈이 없을 때(Jest, 화면만 작업할 때): Kotlin과 같은 규칙을 메모리에서 흉내 냄
export const createMockRawMessageService = ({
  count: initialCount = 128,
  days = 30,
  now = Date.now,
}: MockOptions = {}): RawMessageService => {
  let count = initialCount;
  let cycleStartAt: number | null = null;
  let lastFullDeleteAt: number | null = null;
  const period = days * DAY_MS;

  const purge = () => {
    const current = now();
    const start = cycleStartAt ?? current;
    cycleStartAt = start;
    if (current - start < period) return;
    const boundary = start + Math.floor((current - start) / period) * period;
    count = 0;
    cycleStartAt = boundary;
    lastFullDeleteAt = boundary;
  };

  return {
    async getInfo() {
      purge();
      const start = cycleStartAt ?? now();
      return {
        count,
        days,
        cycleStartAt: start,
        lastFullDeleteAt,
        nextFullDeleteAt: start + period,
      };
    },
    async startCycle(startAt) {
      if (lastFullDeleteAt !== null) return;
      cycleStartAt = Math.min(startAt, now());
      purge();
    },
    async deleteAllNow() {
      const deleted = count;
      count = 0;
      cycleStartAt = now();
      lastFullDeleteAt = cycleStartAt;
      return deleted;
    },
    async reset() {
      count = 0;
      cycleStartAt = null;
      lastFullDeleteAt = null;
    },
  };
};
