import type { ImageSourcePropType } from "react-native";
import heroImage from "@assets/img/home/malssi-home-hero.png";
import pickImage from "@assets/img/home/malssi-mode-pick.png";
import editImage from "@assets/img/home/malssi-mode-edit.png";
import writeImage from "@assets/img/home/malssi-mode-write.png";
import restImage from "@assets/img/home/malssi-mode-rest.png";

// 04 홈: 오늘의 도움 수준 (하루 한 번 고름, 기기에 날짜와 함께 저장)
// 문구는 Figma "오늘의 도움 수준 문구 정리" 표 기준
export type HelpMode = "pick" | "edit" | "write" | "rest";

export interface HeroCopy {
  title: string;
  description: string;
  image: ImageSourcePropType;
  // 제목이 길어 20px로는 한 줄(폭 214)에 안 들어가는 문구만 18px (headingDialog 18/26, 팀 확정)
  compactTitle?: boolean;
}

// 홈 히어로 카드: 아직 선택하지 않음(unset) + 모드 4개
export const HERO: Record<HelpMode | "unset", HeroCopy> = {
  unset: {
    title: "오늘은 어떻게 도와드릴까요?",
    // 20px로 약 229dp라 214dp에 안 들어감 → 18px로 한 줄
    compactTitle: true,
    // 폭 214에 다 안 들어가서, 안드로이드가 글자 단위로 끊으면 "요"만 넘어감 → 낱말 사이에서 직접 나눔
    description: "지금 답장할 수 있는 정도에 맞춰\n도움을 준비할게요",
    image: heroImage,
  },
  pick: {
    title: "준비된 답장 중 골라볼래요",
    description: "상황에 맞는 완성 답장 후보를 준비해둘게요",
    image: pickImage,
  },
  edit: {
    title: "추천을 내 말로 다듬을래요",
    description: "답장 뼈대를 받아 내 말로 가볍게 고쳐요",
    image: editImage,
  },
  write: {
    title: "오늘은 직접 써볼 수 있어요",
    description: "먼저 작성하면 필요한 부분만 가볍게 다듬어드려요",
    image: writeImage,
  },
  rest: {
    title: "오늘은 답장을 잠시 미뤄둘게요",
    description: "급한 연락만 알려드리고 나머지는 조용히 모아둘게요",
    image: restImage,
  },
};

// C02 오늘 상태 선택: 시안 순서대로
export const HELP_OPTIONS: { mode: HelpMode; title: string; description: string }[] =
  [
    {
      mode: "write",
      title: "직접 써볼 수 있어요",
      description: "빈 답장칸과 문장 다듬기만 제공",
    },
    {
      mode: "edit",
      title: "추천을 수정할래요",
      description: "답장 뼈대를 받아 내 말로 고치기",
    },
    {
      mode: "pick",
      title: "골라서 보내고 싶어요",
      description: "완성 답장 후보 중 선택",
    },
    {
      mode: "rest",
      title: "오늘은 미루고 싶어요",
      description: "답장을 만들지 않고 다시 볼 시간 선택",
    },
  ];

// 아직 고르지 않았을 때 C02에서 미리 선택해 두는 모드 (시안 C02 상태)
export const DEFAULT_HELP_MODE: HelpMode = "edit";

// C03~C05 모드 화면 (C06 오늘은 미루기는 백엔드 확인 후)
// descriptionGap: 제목과 설명 사이 (시안 C03 0 / C04·C05 7dp 더 떨어져 있음)
export const MODE_SCREENS: Record<
  Exclude<HelpMode, "rest">,
  { title: string; description: string; action: string; descriptionGap: number }
> = {
  pick: {
    title: "오늘은 고르기만 해도 충분해요",
    description: "완성된 답장 후보를 먼저 보여드릴게요.",
    action: "연락 확인하고 답장 선택하기",
    descriptionGap: 0,
  },
  edit: {
    title: "한 줄 뼈대부터 시작해요",
    description: "핵심 요소를 조합한 초안을 내 말로 수정할 수 있어요.",
    action: "추천 답장 수정하기",
    descriptionGap: 7,
  },
  write: {
    title: "내가 먼저 써보고 필요할 때 다듬어요",
    description: "AI는 빈칸을 채우지 않고 작성한 문장만 요청 시 다듬어요.",
    action: "직접 답장 쓰기",
    descriptionGap: 7,
  },
};
