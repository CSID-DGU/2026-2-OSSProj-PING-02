import { useState } from "react";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import CheckRow from "@components/onboarding/CheckRow";
import Notice from "@components/onboarding/Notice";
import PermissionGuide from "@components/onboarding/PermissionGuide";
import SkipButton from "@components/onboarding/SkipButton";
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

// 06 / 받을 알림 선택 → "다음"에서 시스템 알림 권한(POST_NOTIFICATIONS) 팝업
// 하나도 고르지 않으면 권한을 묻지 않고 넘어감
const NotificationTypes = () => {
  const { goNext } = useOnboardingStep("NotificationTypes");
  const { data, update } = useOnboarding();
  const state = usePermissionStep("postNotifications", LABEL);
  const [selected, setSelected] = useState<NotificationPref[]>(
    data.notificationPrefs
  );
  // 팝업에서 거절한 뒤에는 "이대로 넘어갈게요"를 주 버튼으로
  const askedAndOff = !state.granted && !!state.guide;

  const toggle = (value: NotificationPref) =>
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
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
      centered
      gap={24}
      footer={
        <>
          {askedAndOff && (
            <SkipButton onPress={state.request} disabled={state.requesting}>
              {permissionActionLabel(state, "다시 요청하기")}
            </SkipButton>
          )}
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
            {askedAndOff ? "이대로 넘어갈게요" : "다음"}
          </Button>
        </>
      }
    >
      <AuthIntro
        variant="onboarding"
        title={"받을 알림을\n선택해 주세요"}
        description={
          "전체 선택이 기본값이에요. 원하지 않는 알림은\n체크를 해제할 수 있어요."
        }
      />

      <s.Options>
        {NOTIFICATION_PREF_OPTIONS.map(option => (
          <CheckRow
            key={option.value}
            card="default"
            cardStyle={s.cardStyle}
            checked={selected.includes(option.value)}
            onToggle={() => toggle(option.value)}
            label={option.title}
            description={option.description}
          />
        ))}
      </s.Options>

      {askedAndOff || state.load === "error" ? (
        <PermissionGuide
          state={state}
          label={LABEL}
          consequence="꺼 두면 선택한 알림을 받을 수 없고, 앱을 열었을 때만 확인할 수 있어요."
        />
      ) : (
        !state.granted &&
        selected.length > 0 && (
          <Notice title="다음 단계에서 기기 권한을 요청해요">
            선택한 알림을 보내려면 시스템 알림 권한이 필요해요
          </Notice>
        )
      )}
    </AuthLayout>
  );
};

export default NotificationTypes;
