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
      { key: "profile", title: "내 정보", description: "내 기본 정보를 관리해요" },
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
