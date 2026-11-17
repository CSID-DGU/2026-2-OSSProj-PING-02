import { useState } from "react";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import CheckRow from "@components/onboarding/CheckRow";
import { LINKED_APP_OPTIONS, type LinkedApp } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./LinkedApps_styled";

// 05 / 연동 앱 선택: 앱 아이콘 위에 체크 줄이 붙은 가로 3칸 다중 선택
// 칸 전체(체크·이름·아이콘)를 누르면 토글. 최소 1개를 골라야 버튼이 켜짐
const LinkedApps = () => {
  const { goNext } = useOnboardingStep("LinkedApps");
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState<LinkedApp[]>(data.linkedApps);

  const toggle = (app: LinkedApp) =>
    setSelected(prev =>
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );

  const empty = selected.length === 0;

  const handleNext = () => {
    if (empty) return;
    // 메모리 저장소라 실패할 일이 거의 없고, 실패해도 이번 실행 동안은 상태가 유지됨
    update({ linkedApps: selected }).catch(() => {});
    goNext();
  };

  return (
    <AuthLayout backOnly
      centered
      gap={32}
      // TODO(Figma 문구 확인): 시안은 "말씨앗 시작하기"지만 흐름 중간이라 "다음"으로 둠
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleNext}
          disabled={empty}
          accessibilityHint={
            empty ? "앱을 하나 이상 고르면 누를 수 있어요" : undefined
          }
        >
          다음
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title="도움을 받을 앱을 선택해요"
        description="선택한 앱에서 앞으로 도착하는 알림만 확인해요"
      />

      <s.AppRow>
        {LINKED_APP_OPTIONS.map(app => (
          <CheckRow
            key={app.value}
            checked={selected.includes(app.value)}
            onToggle={() => toggle(app.value)}
            label={app.label}
            labelTone="brand"
            centered
            style={s.cellStyle}
          >
            {/* 아이콘을 눌러도 토글 (실기기에서 아이콘 터치가 칸까지 전달되지 않는 경우 대비)
                스크린리더는 칸 전체를 체크박스 하나로 읽고, 아이콘은 따로 읽지 않음 */}
            <s.IconWrap>
              <s.IconPress
                onPress={() => toggle(app.value)}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <s.AppIcon source={app.icon} />
              </s.IconPress>
            </s.IconWrap>
          </CheckRow>
        ))}
      </s.AppRow>

      <s.Caption accessibilityLiveRegion="polite">
        {empty
          ? "하나 이상 골라 주세요. 언제든 설정에서 변경할 수 있어요"
          : "언제든 설정에서 변경할 수 있어요"}
      </s.Caption>
    </AuthLayout>
  );
};

export default LinkedApps;
