import type { ImageSourcePropType } from "react-native";
import sittingSeeds from "@assets/img/onboarding/malssi-sitting-seeds.png";
import introConnection from "@assets/img/onboarding/intro-connection.png";
import introFirstContact from "@assets/img/onboarding/intro-first-contact.png";
import introSituationCard from "@assets/img/onboarding/intro-situation-card.png";
import iconBirthday from "@assets/img/onboarding/icon-birthday.png";
import iconHeart from "@assets/img/onboarding/icon-heart.png";
import iconChat from "@assets/img/onboarding/icon-chat.png";
import iconWave from "@assets/img/onboarding/icon-wave.png";
import iconOccasion from "@assets/img/onboarding/icon-occasion.png";
import iconWork from "@assets/img/onboarding/icon-work.png";
import iconCounseling from "@assets/img/onboarding/icon-counseling.png";
import iconPrivacyDevice from "@assets/img/onboarding/icon-privacy-device.png";
import iconPrivacyMasked from "@assets/img/onboarding/icon-privacy-masked.png";
import iconPrivacyConfirm from "@assets/img/onboarding/icon-privacy-confirm.png";

// 온보딩 그림 (원본: UI/assets, 표시 크기는 Figma PNG(2x)에서 잰 값 → 1x/2x/3x로 줄여 둠)
export interface OnboardingImage {
  source: ImageSourcePropType;
  width: number;
  height: number;
}

const img = (
  source: ImageSourcePropType,
  width: number,
  height: number
): OnboardingImage => ({ source, width, height });

export const ONBOARDING_IMAGES = {
  // 04: 씨앗을 안고 앉은 말씨 (remembering-messages)
  sittingSeeds: img(sittingSeeds, 116, 110),
  // 12: 같은 그림을 04의 0.88배로 (Figma 12 그림 85×97.5dp, 04는 96.5×110.5dp)
  sittingSeedsDone: img(sittingSeeds, 102, 97),
  // 02-1: 씨앗 덩굴을 건네는 말씨
  introConnection: img(introConnection, 252, 126),
  // 02-3: 씨앗을 심으며 걷는 말씨 (Figma 방향에 맞춰 좌우 반전)
  introFirstContact: img(introFirstContact, 160, 107),
  // 02-5: 메모 카드를 든 말씨
  introSituationCard: img(introSituationCard, 196, 145),
};

export const ONBOARDING_ICONS = {
  birthday: img(iconBirthday, 32, 32),
  heart: img(iconHeart, 32, 32),
  chat: img(iconChat, 32, 32),
  wave: img(iconWave, 32, 32),
  occasion: img(iconOccasion, 32, 32),
  work: img(iconWork, 32, 32),
  counseling: img(iconCounseling, 32, 32),
  privacyDevice: img(iconPrivacyDevice, 44, 40),
  privacyMasked: img(iconPrivacyMasked, 44, 40),
  privacyConfirm: img(iconPrivacyConfirm, 44, 40),
};
