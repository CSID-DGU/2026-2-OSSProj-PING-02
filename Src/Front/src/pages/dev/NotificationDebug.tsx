import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Share, ToastAndroid } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "@core/ui/button";
import { Header } from "@core/ui/header";
import { Checkbox } from "@core/ui/checkbox";
import { Card, CardTitle, CardDescription, CardMeta } from "@core/ui/card";
import NotificationStore, {
  MESSENGER_PACKAGES,
  toExportJson,
  type InstalledApp,
  type RawNotificationDump,
  type StoredNotification,
} from "@native/NotificationStore";
import * as s from "./NotificationDebug_styled";

// 알림 수집 기능 확인용 임시 화면 (개발·팀원 테스트용)
// 권한 허용 → 앱 선택 → 해당 앱에 알림이 오면 아래 목록에 쌓임
// 원본 수집을 켜면 알림 원본(JSON)도 남아서 복사·공유할 수 있음

const EXPORT_LIMIT = 50; // 공유 인텐트 크기 제한 때문에 최근 것만 내보냄

const formatTime = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
};

// 이 알림에서 메시지를 몇 건 새로 저장했는지, 안 했다면 왜인지
const describeParse = (json: string) => {
  try {
    const raw = JSON.parse(json);
    const parsed: number = raw.parsed?.length ?? 0;
    const saved: number | undefined = raw.savedCount;
    if (parsed > 0) {
      // 이전 버전에서 남긴 원본에는 savedCount가 없음
      if (saved === undefined) return `메시지 ${parsed}건 (저장 여부 모름)`;
      const duplicated = parsed - saved;
      return duplicated > 0
        ? `새로 저장 ${saved}건 · 이미 있음 ${duplicated}건`
        : `새로 저장 ${saved}건`;
    }
    const flags: string[] = raw.flags ?? [];
    if (flags.includes("GROUP_SUMMARY")) return "저장 안 함 (묶음 요약)";
    if (flags.includes("ONGOING_EVENT")) return "저장 안 함 (상시 알림)";
    return "저장 안 함 (본문 없음)";
  } catch {
    return "";
  }
};

const toast = (message: string) =>
  ToastAndroid.show(message, ToastAndroid.SHORT);

const NotificationDebug = () => {
  const navigation = useNavigation();
  const [granted, setGranted] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [monitored, setMonitored] = useState<string[]>([]);
  const [showAllApps, setShowAllApps] = useState(false);
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [rawEnabled, setRawEnabled] = useState(false);
  const [dumps, setDumps] = useState<RawNotificationDump[]>([]);
  const [openDumpId, setOpenDumpId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [ok, list, raws] = await Promise.all([
      NotificationStore.isPermissionGranted(),
      NotificationStore.getNotifications({ limit: 100 }),
      NotificationStore.getRawDumps({ limit: EXPORT_LIMIT }),
    ]);
    setGranted(ok);
    setItems(list);
    setDumps(raws);
  }, []);

  useEffect(() => {
    refresh();
    NotificationStore.getInstalledApps().then(setApps);
    NotificationStore.getMonitoredApps().then(setMonitored);
    NotificationStore.isRawDumpEnabled().then(setRawEnabled);

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

  const handleToggleRaw = async (checked: boolean) => {
    setRawEnabled(checked);
    await NotificationStore.setRawDumpEnabled(checked);
  };

  const handleCopyDumps = async () => {
    if (dumps.length === 0) return toast("복사할 원본이 없습니다.");
    await NotificationStore.copyToClipboard(toExportJson(dumps));
    toast(`원본 ${dumps.length}개를 복사했습니다.`);
  };

  const handleCopyOneDump = async (dump: RawNotificationDump) => {
    await NotificationStore.copyToClipboard(dump.json);
    toast(`${dump.appName} 원본 1개를 복사했습니다.`);
  };

  const handleShareDumps = async () => {
    if (dumps.length === 0) return toast("공유할 원본이 없습니다.");
    await Share.share({ message: toExportJson(dumps) });
  };

  const handleClearDumps = async () => {
    await NotificationStore.clearRawDumps();
    refresh();
  };

  const handleClear = async () => {
    await NotificationStore.clearNotifications();
    refresh();
  };

  return (
    <s.Screen>
      <Header
        title="알림 수집 테스트"
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

          <s.SectionTitle>3. 원본 수집 (테스트용)</s.SectionTitle>
          <Checkbox
            label="알림 원본 기록하기"
            checked={rawEnabled}
            onChange={handleToggleRaw}
          />
          <s.Warning>
            원본에는 받은 메시지 내용이 그대로 담깁니다. 테스트용 메시지만
            주고받고, 테스트가 끝나면 원본을 삭제해 주세요.
          </s.Warning>
          <s.Row>
            <Button variant="secondary" onPress={handleCopyDumps}>
              JSON 복사
            </Button>
            <Button variant="secondary" onPress={handleShareDumps}>
              공유
            </Button>
            <Button variant="text" onPress={handleClearDumps}>
              원본 삭제
            </Button>
          </s.Row>
          <s.Description>
            최근 원본 {dumps.length}개 · 카드를 누르면 전체 내용을 보고 그
            원본만 복사할 수 있습니다.
          </s.Description>
          {dumps.map((dump) => (
            <Card
              key={dump.id}
              onPress={() =>
                setOpenDumpId((id) => (id === dump.id ? null : dump.id))
              }
            >
              <CardTitle>{dump.appName}</CardTitle>
              <CardDescription>{dump.summary || "(내용 없음)"}</CardDescription>
              <CardMeta>
                {formatTime(dump.postedAt)} · {describeParse(dump.json)}
              </CardMeta>
              {openDumpId === dump.id && (
                <>
                  <s.Row $top={12}>
                    <Button
                      variant="secondary"
                      onPress={() => handleCopyOneDump(dump)}
                    >
                      이 원본 복사
                    </Button>
                    <Button
                      variant="secondary"
                      onPress={() => Share.share({ message: dump.json })}
                    >
                      공유
                    </Button>
                  </s.Row>
                  {/* 길게 눌러 일부만 선택해서 복사할 수도 있음 */}
                  <s.RawJson selectable>{dump.json}</s.RawJson>
                </>
              )}
            </Card>
          ))}

          <s.SectionTitle>4. 저장된 알림 ({items.length})</s.SectionTitle>
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
