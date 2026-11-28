import { NOTIFICATION_PREF_OPTIONS } from "./onboarding";

// 08 설정 (Figma "08 설정 · 개인정보 · 계정" H01 설정 메인) 메뉴 구성
// 문구는 시안 그대로. 화면이 생기면 route를 채움 (없으면 누를 수 없음)

export type SettingsMenuKey =
  | "profile"
  | "contacts"
  | "linkedApps"
  | "replyGuide"
  | "notifications"
  | "storedData"
  | "logout"
  | "withdraw";

export interface SettingsMenuItem {
  key: SettingsMenuKey;
  title: string;
  description?: string;
}

export interface SettingsMenuSection {
  title: string;
  items: SettingsMenuItem[];
}

export const SETTINGS_SECTIONS: SettingsMenuSection[] = [
  {
    title: "내 계정",
    items: [
      {
        key: "profile",
        title: "내 정보",
        description: "내 기본 정보를 관리해요",
      },
    ],
  },
  {
    title: "연락 설정",
    items: [
      {
        key: "contacts",
        title: "연락처 불러오기",
        description: "연락처를 불러와서 친구 목록을 업데이트해요",
      },
      {
        key: "linkedApps",
        title: "확인할 메신저 앱",
        description: "새 연락을 확인할 앱과 알림 접근 권한을 관리해요",
      },
    ],
  },
  {
    title: "AI 맞춤 설정",
    items: [
      {
        key: "replyGuide",
        title: "내 상황과 답장 기준",
        description: "AI가 답장을 만들 때 참고할 기준을 정해요",
      },
    ],
  },
  {
    title: "알림",
    items: [
      {
        key: "notifications",
        title: "알림 설정",
        description: "말씨앗이 보내는 알림과 시간을 관리해요",
      },
    ],
  },
  {
    title: "데이터 및 개인정보",
    items: [
      {
        key: "storedData",
        title: "저장된 데이터",
        description: "원문, 요약·답장 기록과 AI 기억을 관리해요",
      },
    ],
  },
  {
    title: "계정 관리",
    items: [
      { key: "logout", title: "로그아웃" },
      { key: "withdraw", title: "회원 탈퇴" },
    ],
  },
];

// H08 문구
export const SETTINGS_COPY = {
  logoutTitle: "이 기기에서 로그아웃 할까요?",
  logoutConfirm: "로그아웃",
  withdrawTitle: "계정을 삭제할까요?",
  withdrawKeep: "계속해서 사용하기",
  withdrawProceed: "탈퇴 진행하기",
  withdrawSheetTitle: "회원 탈퇴하기",
  passwordMatch: "비밀번호가 일치해요.",
  // TODO(Figma 문구 확인): 시안의 빨간 오류 칸 문구가 "비밀번호가 일치해요."로 적혀 있어 바꿔 씀 (팀 확정)
  passwordMismatch: "비밀번호가 일치하지 않아요.",
  // TODO(디자이너 공유): 아래 두 문구는 시안에 없는 상태 (서버가 비밀번호 틀림·요청 실패를 돌려줄 때)
  wrongPassword: "비밀번호가 맞지 않아요. 다시 확인해주세요.",
  withdrawFailed: "탈퇴하지 못했어요. 다시 시도해주세요.",
} as const;

// H07 저장된 데이터 문구 (Figma 534:23413 등). 숫자·날짜는 화면에서 채움
const pad = (n: number) => String(n).padStart(2, "0");
/** 시안 표기 "2026.12.21" */
export const formatDotDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

export const STORED_DATA_COPY = {
  title: "저장된 데이터",
  friendCache: "친구별 원문 캐시",
  friendCacheDescription: "친구 상세에서 한 명씩 관리",
  rawCache: "수집 원문 전체 캐시",
  rawCount: "수집 원문 개수",
  lastDelete: "마지막 전체 캐시 삭제일",
  nextDelete: "다음 전체 캐시 삭제일",
  // 아직 한 번도 전체 삭제를 하지 않았을 때 (시안 없음, 팀 확정)
  noDate: "-",
  aiRecords: "요약·답장 기록",
  summaryCount: "요약 연락 개수",
  replyCount: "답장 개수",
  cancel: "취소하기",
  rawDeleteBody:
    "삭제된 원문은 말씨앗에서 복구할 수 없어요.\n메신저의 원본 대화와 요약·답장 기록,\n일정·관계 정보는 유지돼요.\n삭제한 원문으로 다시 요약하거나\n답장을 만들 수 없어요.",
  aiDeleteBody:
    "삭제된 기록은 복구할 수 없어요.\n원문 캐시와 저장된 일정·관계 정보는 유지돼요.",
  // TODO(디자이너 공유): 삭제 실패는 시안에 없는 상태
  deleteFailed: "삭제하지 못했어요. 다시 시도해주세요.",
  count: (n: number) => `${n}건`,
  rawSubtitleCollapsed: (n: number, next: number) =>
    `${n}건 ${formatDotDate(next)} 삭제 예정`,
  rawDeleteButton: (n: number) => `원문 ${n}개 지금 바로 삭제하기`,
  aiDeleteButton: (n: number) => `요약·답장 기록 ${n}건 삭제하기`,
  rawDeleteTitle: (n: number) =>
    `말씨앗에 저장된 원문 ${n}개를\n모두 삭제할까요?`,
  // 시안 "자동 삭제 돼요" → 맞춤법대로 붙여 씀
  rawDeleteNote: (next: number) => {
    const d = new Date(next);
    return `지금 삭제하지 않아도 ${
      d.getMonth() + 1
    }월 ${d.getDate()}일에 자동 삭제돼요.`;
  },
  aiDeleteTitle: (n: number) =>
    `저장된 요약·답장 기록 ${n}개를\n모두 삭제할까요?`,
  deleteAll: (n: number) => `${n}개 모두 삭제하기`,
  // 시안의 삭제 완료 토스트 숫자(128 → 0 등)는 오류로 보고 실제 지운 개수로 (팀 확정)
  rawDeleted: (n: number) => `원문 ${n}개가 모두 삭제됐어요`,
  aiDeleted: (n: number) => `저장된 요약·답장 기록 ${n}개가 모두 삭제됐어요`,
} as const;

// H06 알림 설정: 온보딩 06의 6개 + 재연결 제안 (Figma 530:21022)
// 재연결 제안은 온보딩에서 고르지 않으므로 처음에는 꺼져 있고, 그래서 "전체 알림"도 꺼져 보임 (시안 H06 첫 화면과 같음)
export const SETTINGS_NOTIFICATION_PREF_OPTIONS = [
  ...NOTIFICATION_PREF_OPTIONS,
  {
    value: "RECONNECT" as const,
    title: "재연결 제안",
    description: "오래 연락하지 않은 친구의 안부를 제안해요",
  },
];

export const NOTIFICATION_SETTINGS_COPY = {
  title: "알림 설정",
  save: "저장하기",
  saved: "알림 설정을 저장했어요",
  saveFailed: "알림 설정 저장에 실패했어요. 다시 시도해주세요.",
} as const;

// H05 내 상황과 답장 기준 (Figma 526:19250, 521:17358 처음, 521:18012 저장 성공, 521:17897 저장 실패)
export const REPLY_GUIDE_COPY = {
  title: "내 상황과 답장 기준",
  save: "답장 기준 저장하기",
  saved: "답장 기준을 저장했어요!",
  saveFailed: "저장하지 못했어요. 다시 시도해주세요.",
} as const;
