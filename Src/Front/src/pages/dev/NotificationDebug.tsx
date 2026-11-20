import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "@core/ui/button";
import { Header } from "@core/ui/header";
import { Checkbox } from "@core/ui/checkbox";
import { Card, CardTitle, CardDescription, CardMeta } from "@core/ui/card";
import NotificationStore, {
  MESSENGER_PACKAGES,
  type InstalledApp,
  type StoredNotification,
} from "@native/NotificationStore";
import * as s from "./NotificationDebug_styled";

// 알림 수집 기능 확인용 임시 화면 (개발용)
// 권한 허용 → 앱 선택 → 해당 앱에 알림이 오면 아래 목록에 쌓임
// TODO: 온보딩(B03 알림 접근·B06 연동 앱)과 연락 화면이 실제 데이터로 연결되면 삭제

const formatTime = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
};

const NotificationDebug = () => {
  const navigation = useNavigation();
  const [granted, setGranted] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [monitored, setMonitored] = useState<string[]>([]);
  const [showAllApps, setShowAllApps] = useState(false);
  const [items, setItems] = useState<StoredNotification[]>([]);

  const refresh = useCallback(async () => {
    const [ok, list] = await Promise.all([
      NotificationStore.isPermissionGranted(),
      NotificationStore.getNotifications({ limit: 100 }),
    ]);
    setGranted(ok);
    setItems(list);
  }, []);

  useEffect(() => {
    refresh();
    NotificationStore.getInstalledApps().then(setApps);
    NotificationStore.getMonitoredApps().then(setMonitored);

    // 설정 화면에서 권한을 켜고 돌아오거나, 메신저를 보고 돌아오면 다시 불러옴
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // 선택한 앱 → 메신저 → 나머지 순으로 보여 줌
  const visibleApps = useMemo(() => {
    const rank = (app: InstalledApp) => {
      if (monitored.includes(app.packageName)) return 0;
      if (MESSENGER_PACKAGES.includes(app.packageName)) return 1;
      return 2;
    };
    const sorted = [...apps].sort((a, b) => rank(a) - rank(b));
    return showAllApps ? sorted : sorted.filter((app) => rank(app) < 2);
  }, [apps, monitored, showAllApps]);

  const handleToggleApp = async (packageName: string, checked: boolean) => {
    const next = checked
      ? [...monitored, packageName]
      : monitored.filter((p) => p !== packageName);
    setMonitored(next);
    await NotificationStore.setMonitoredApps(next);
  };

  const handleClear = async () => {
    await NotificationStore.clearNotifications();
    refresh();
  };

  return (
    <s.Screen>
      <Header
        title="알림 수집 확인"
        titleAlign="center"
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        divider
      />

      <s.Content>
        <s.Section>
          <s.SectionTitle>1. 알림 접근 권한</s.SectionTitle>
          <s.StatusText $ok={granted}>
            {granted ? "✓ 허용됨" : "✕ 허용 안 됨"}
          </s.StatusText>
          {!granted && (
            <Button
              variant="primary"
              fullWidth
              onPress={NotificationStore.openPermissionSettings}
            >
              알림 접근 허용하러 가기
            </Button>
          )}

          <s.SectionTitle>2. 알림을 저장할 앱</s.SectionTitle>
          <s.Description>
            체크한 앱에서 온 알림만 기기 안 DB에 저장됩니다.
          </s.Description>
          <s.AppList>
            {visibleApps.map((app) => (
              <Checkbox
                key={app.packageName}
                label={`${app.appName} (${app.packageName})`}
                checked={monitored.includes(app.packageName)}
                onChange={(checked) =>
                  handleToggleApp(app.packageName, checked)
                }
              />
            ))}
          </s.AppList>
          <Button variant="text" onPress={() => setShowAllApps((v) => !v)}>
            {showAllApps ? "메신저만 보기" : `전체 앱 보기 (${apps.length})`}
          </Button>

          <s.SectionTitle>3. 저장된 알림 ({items.length})</s.SectionTitle>
          <s.Row>
            <Button variant="secondary" onPress={refresh}>
              새로고침
            </Button>
            <Button variant="text" onPress={handleClear}>
              전체 삭제
            </Button>
          </s.Row>
          {items.length === 0 && (
            <s.Description>
              아직 저장된 알림이 없습니다. 선택한 앱으로 메시지를 받아 보세요.
            </s.Description>
          )}
          {items.map((item) => (
            <Card key={item.id}>
              <CardTitle>
                {item.conversationTitle || item.appName}
                {item.isGroupConversation ? " (단톡)" : ""}
              </CardTitle>
              <CardDescription>
                {item.sender && item.sender !== item.conversationTitle
                  ? `${item.sender}: `
                  : ""}
                {item.text}
              </CardDescription>
              <CardMeta>
                {item.appName} · {formatTime(item.messageTime)}
                {item.isMention ? " · 나를 멘션" : ""}
                {item.contentType !== "text" ? ` · ${item.contentType}` : ""}
                {item.isPlaceholder ? " · 내용 없음(AI 제외)" : ""}
              </CardMeta>
            </Card>
          ))}
        </s.Section>
      </s.Content>
    </s.Screen>
  );
};

export default NotificationDebug;
