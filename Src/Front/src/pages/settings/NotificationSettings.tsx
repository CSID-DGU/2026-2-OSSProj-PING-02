import { useState } from "react";
import { Button } from "@core/ui/button";
import { useToast } from "@core/ui/toast";
import NotificationPrefList from "@components/onboarding/NotificationPrefList";
import SettingsLayout from "@components/settings/SettingsLayout";
import type { NotificationPref } from "@constants/onboarding";
import {
  NOTIFICATION_SETTINGS_COPY as C,
  SETTINGS_NOTIFICATION_PREF_OPTIONS,
} from "@constants/settings";
import { usePermissionStep } from "@hooks/usePermissionStep";
import { useOnboarding } from "@stores/OnboardingProvider";

// 08 설정 H06 알림 설정 (Figma 526:19458 첫 화면, 530:21022 변경, 530:21179 저장 성공, 530:21341 저장 실패, 538:25462 권한 팝업)
// - 목록은 온보딩 06과 같은 NotificationPrefList (+ 재연결 제안), 값도 온보딩에서 고른 notificationPrefs를 그대로 고침
// - 바꾼 것이 있을 때만 "저장하기"가 진한 노랑 (시안 첫 화면은 연노랑)
// - 켠 알림이 있는데 시스템 알림 권한이 없으면 저장할 때 안드로이드 권한 팝업(06-1과 같음)을 띄움. 거절해도 설정은 저장
const sameSet = (a: NotificationPref[], b: NotificationPref[]) =>
  a.length === b.length && a.every((v) => b.includes(v));

const NotificationSettings = () => {
  const toast = useToast();
  const { data, update } = useOnboarding();
  const permission = usePermissionStep("postNotifications", "앱 알림");
  const [selected, setSelected] = useState<NotificationPref[]>(
    data.notificationPrefs
  );
  const [saving, setSaving] = useState(false);
  const dirty = !sameSet(selected, data.notificationPrefs);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      if (selected.length > 0 && !permission.granted) {
        await permission.request().catch(() => undefined);
      }
      await update({ notificationPrefs: selected });
      toast.show(C.saved);
    } catch {
      toast.show(C.saveFailed, { icon: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout
      title={C.title}
      gap={0}
      footer={
        <Button
          variant={dirty ? "primary" : "secondary"}
          fullWidth
          onPress={handleSave}
          disabled={saving}
          accessibilityState={{ disabled: !dirty || saving, busy: saving }}
        >
          {C.save}
        </Button>
      }
    >
      <NotificationPrefList
        options={SETTINGS_NOTIFICATION_PREF_OPTIONS}
        selected={selected}
        onChange={setSelected}
      />
    </SettingsLayout>
  );
};

export default NotificationSettings;
