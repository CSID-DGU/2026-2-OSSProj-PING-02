import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getNextStep, type OnboardingStep } from "@constants/onboarding";
import { useOnboarding } from "@stores/OnboardingProvider";
import { useAuthNavigation } from "./useAuthNavigation";

// 온보딩 단계 화면 공통: 다음 단계 이동, "이어서 하기" 위치 저장
// (Figma에 헤더·진행 표시가 없어서 뒤로가기는 안드로이드 기본 동작: 이전 단계)
export const useOnboardingStep = (step: OnboardingStep) => {
  const navigation = useAuthNavigation();
  const { data, update } = useOnboarding();
  const { completed } = data;

  useFocusEffect(
    useCallback(() => {
      // 저장에 실패해도 진행에는 영향이 없어서 무시 (다음에 열면 앞 단계부터 다시 보일 뿐)
      if (!completed) update({ lastStep: step }).catch(() => {});
    }, [completed, step, update])
  );

  const goNext = useCallback(
    () => navigation.navigate(getNextStep(step)),
    [navigation, step]
  );

  return { navigation, goNext };
};
