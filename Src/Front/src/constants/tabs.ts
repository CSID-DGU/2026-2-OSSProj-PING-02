import type { ComponentType } from "react";
import {
  CalendarIcon,
  ChatIcon,
  FriendsIcon,
  HomeIcon,
  SettingsIcon,
} from "@core/ui/icon";

// 하단 탭 설정 (한 곳에서 관리). 아이콘: UI/assets/icons/ui (Figma 00 하단탭바)
export type MainTabKey = "home" | "contacts" | "friends" | "calendar" | "settings";

export interface MainTabConfig {
  key: MainTabKey;
  label: string; // 탭 글자
  title: string; // 화면 위 제목
  icon: ComponentType<{ color?: string }>; // 선택 여부는 색으로 (_active.svg = 진한 색)
}

export const MAIN_TABS: MainTabConfig[] = [
  { key: "home", label: "홈", title: "말씨앗", icon: HomeIcon },
  { key: "contacts", label: "연락", title: "연락", icon: ChatIcon },
  { key: "friends", label: "친구", title: "친구", icon: FriendsIcon },
  { key: "calendar", label: "캘린더", title: "캘린더", icon: CalendarIcon },
  { key: "settings", label: "설정", title: "설정", icon: SettingsIcon },
];

export const DEFAULT_TAB: MainTabKey = "home";
