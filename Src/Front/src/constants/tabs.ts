// 하단 탭 설정 (한 곳에서 관리)
// TODO(디자인): 탭바 시안·아이콘 SVG가 오면
//   1) UI/assets/icons/ui 에 SVG 추가 → core/ui/icon 에 등록 (팀 허용 예외)
//   2) 아래 icon 칸에 아이콘 컴포넌트 이름을 넣고 TabBar에서 그리기
// 지금은 글자 탭으로 임시 구현
export type MainTabKey = "home" | "contacts" | "friends" | "calendar" | "settings";

export interface MainTabConfig {
  key: MainTabKey;
  label: string; // 탭 글자
  title: string; // 화면 위 제목
  icon?: string; // TODO(디자인): 아이콘 이름
}

export const MAIN_TABS: MainTabConfig[] = [
  { key: "home", label: "홈", title: "말씨앗" },
  { key: "contacts", label: "연락", title: "연락" },
  { key: "friends", label: "친구", title: "친구" },
  { key: "calendar", label: "캘린더", title: "캘린더" },
  { key: "settings", label: "설정", title: "설정" },
];

export const DEFAULT_TAB: MainTabKey = "home";
