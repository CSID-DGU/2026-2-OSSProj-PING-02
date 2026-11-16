import { useState } from "react";
import { Button } from "@core/ui/button";
import { Checkbox } from "@core/ui/checkbox";
import { Field } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import { LINKED_APP_OPTIONS, type LinkedApp } from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./LinkedApps_styled";

// 05 / 연동 앱 선택 (온보딩 3단계)
// 앱 아이콘 위에 Checkbox가 붙은 가로 3칸 다중 선택, 최소 1개를 골라야 다음으로
const LinkedApps = () => {
  const { goNext } = useOnboardingStep("LinkedApps");
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState<LinkedApp[]>(data.linkedApps);

  const toggle = (app: LinkedApp, checked: boolean) =>
    setSelected(prev =>
      checked ? [...prev.filter(a => a !== app), app] : prev.filter(a => a !== app)
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
      footer={
        <Button
          variant="primary"
          fullWidth
          onPress={handleNext}
          disabled={empty}
          accessibilityHint={empty ? "앱을 하나 이상 고르면 누를 수 있어요" : undefined}
        >
          다음
        </Button>
      }
    >
      <AuthIntro
        variant="onboarding"
        title="어떤 앱의 연락을 함께 볼까요?"
        description="고른 앱의 알림만 읽어요. 나중에 언제든 바꿀 수 있어요."
      />

      <Field
        helper={
          empty
            ? "하나 이상 골라 주세요."
            : `${selected.length}개를 골랐어요.`
        }
      >
        <s.AppRow>
          {LINKED_APP_OPTIONS.map(app => {
            const checked = selected.includes(app.value);
            return (
              <s.AppCell key={app.value} $checked={checked}>
                <Checkbox
                  label={app.label}
                  checked={checked}
                  onChange={next => toggle(app.value, next)}
                />
                {/* 아이콘을 눌러도 선택되게. 스크린리더는 체크박스 하나만 읽도록 숨김 */}
                <s.IconButton
                  onPress={() => toggle(app.value, !checked)}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <s.AppIcon source={app.icon} />
                </s.IconButton>
              </s.AppCell>
            );
          })}
        </s.AppRow>
      </Field>
    </AuthLayout>
  );
};

export default LinkedApps;
