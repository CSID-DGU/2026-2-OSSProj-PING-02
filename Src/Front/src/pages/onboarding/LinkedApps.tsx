import { useState } from "react";
import { Button } from "@core/ui/button";
import { Checkbox } from "@core/ui/checkbox";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { LINKED_APP_OPTIONS, type LinkedApp } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./LinkedApps_styled";

// 05 / 연동 앱 선택: 앱 아이콘 위에 Checkbox가 붙은 가로 3칸 다중 선택
// 최소 1개를 골라야 버튼이 켜짐 (Figma에 빈 상태가 없어 아래 안내 문구로 알려 줌)
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
    <AuthLayout
      centered
      gap={32}
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
          말씨앗 시작하기
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title="도움을 받을 앱을 선택해요"
        description="선택한 앱에서 앞으로 도착하는 알림만 확인해요"
      />

      <s.AppRow>
        {LINKED_APP_OPTIONS.map(app => {
          const checked = selected.includes(app.value);
          return (
            <s.AppCell key={app.value}>
              <Checkbox
                label={app.label}
                checked={checked}
                onChange={() => toggle(app.value)}
                emphasis
              />
              {/* 아이콘을 눌러도 선택되게. 스크린리더는 체크박스 하나만 읽도록 숨김 */}
              <s.IconButton
                onPress={() => toggle(app.value)}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <s.AppIcon source={app.icon} />
              </s.IconButton>
            </s.AppCell>
          );
        })}
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
