import { useState } from "react";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import SkipButton from "@components/onboarding/SkipButton";
import SwitchLine from "@components/onboarding/SwitchLine";
import {
  NOTIFICATION_PREF_OPTIONS,
  type NotificationPref,
} from "@constants/onboarding";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import {
  permissionActionLabel,
  usePermissionStep,
} from "@hooks/usePermissionStep";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./NotificationTypes_styled";

const LABEL = "앱 알림";
const ALL = NOTIFICATION_PREF_OPTIONS.map(o => o.value);

// 06 / 받을 알림 선택 → "확인했어요"에서 06-1 시스템 알림 권한(POST_NOTIFICATIONS) 팝업
// - 줄마다 스위치, "전체 알림"은 모두 켜져 있으면 켜짐 / 누르면 모두 켜기·끄기
// - 하나도 켜지 않으면 권한을 묻지 않고 넘어감
// - 06-1은 안드로이드 시스템 팝업이라 모양·문구는 바꿀 수 없음 (Figma 06-1은 참고용)
const NotificationTypes = () => {
  const { goNext } = useOnboardingStep("NotificationTypes");
  const { data, update } = useOnboarding();
  const state = usePermissionStep("postNotifications", LABEL);
  const [selected, setSelected] = useState<NotificationPref[]>(
    data.notificationPrefs
  );
  // 팝업에서 거절한 뒤에는 "이대로 넘어갈게요"를 주 버튼으로
  const askedAndOff = !state.granted && !!state.guide;
  const allOn = ALL.every(v => selected.includes(v));

  const setOne = (value: NotificationPref, on: boolean) =>
    setSelected(prev =>
      on ? [...prev.filter(v => v !== value), value] : prev.filter(v => v !== value)
    );

  const handleNext = async () => {
    update({ notificationPrefs: selected }).catch(() => {});
    if (selected.length === 0 || state.granted || askedAndOff) {
      goNext();
      return;
    }
    const result = await state.request();
    if (result === "granted") goNext();
  };

  return (
    <AuthLayout
      backOnly
      gap={26}
      footer={
        <>
          <Button
            variant="primary"
            fullWidth
            onPress={handleNext}
            disabled={state.requesting}
            accessibilityState={{
              busy: state.requesting,
              disabled: state.requesting,
            }}
          >
            {askedAndOff ? "이대로 넘어갈게요" : "확인했어요"}
          </Button>
          {askedAndOff && (
            <SkipButton onPress={state.request} disabled={state.requesting}>
              {permissionActionLabel(state, "다시 요청하기")}
            </SkipButton>
          )}
        </>
      }
    >
      <AuthIntro variant="onboarding" title={"받을 알림을\n선택해 주세요"} />

      <s.Options>
        <s.AllBox>
          <SwitchLine
            box
            label="전체 알림"
            value={allOn}
            onValueChange={on => setSelected(on ? ALL : [])}
          />
        </s.AllBox>
        {NOTIFICATION_PREF_OPTIONS.map(option => (
          <SwitchLine
            key={option.value}
            label={option.title}
            description={option.description}
            value={selected.includes(option.value)}
            onValueChange={on => setOne(option.value, on)}
            style={s.lineStyle}
          />
        ))}
      </s.Options>

      {/* Figma에 없는 상태: 팝업에서 거절했거나 권한 확인 오류일 때만 부드러운 안내 (Q4) */}
      {(askedAndOff || state.load === "error") && (
        <PermissionGuide
          align="left"
          state={state}
          label={LABEL}
          consequence="꺼 두면 선택한 알림을 받을 수 없고, 앱을 열었을 때만 확인할 수 있어요."
        />
      )}
    </AuthLayout>
  );
};

export default NotificationTypes;
