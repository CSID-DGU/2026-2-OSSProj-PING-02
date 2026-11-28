import { useState } from "react";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { Checkbox } from "@core/ui/checkbox";
import { useToast } from "@core/ui/toast";
import SettingsLayout from "@components/settings/SettingsLayout";
import { LINKED_APP_OPTIONS, type LinkedApp } from "@constants/onboarding";
import { LINKED_APPS_COPY as C } from "@constants/settings";
import { useOnboarding } from "@stores/OnboardingProvider";

// 08 설정 H04 확인할 메신저 앱 (Figma 518:16861, 526:19126)
// - 온보딩 05에서 고른 연동 앱(linkedApps)을 고침. 저장하면 알림을 모을 앱 목록도 바로 바뀜 (OnboardingProvider, #83)
// - 시안: 소제목·설명 → "전체 선택" 연노랑 상자 → 앱 줄(체크 20 · 아이콘 44 · 이름) 사이 구분선 → 저장하기
// - 바꾼 것이 있을 때만 저장 버튼이 진한 노랑
const ALL = LINKED_APP_OPTIONS.map((o) => o.value);

const LinkedAppsSettings = () => {
  const toast = useToast();
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState<LinkedApp[]>(data.linkedApps);
  const [saving, setSaving] = useState(false);

  const allOn = ALL.every((v) => selected.includes(v));
  const empty = selected.length === 0;
  const dirty =
    selected.length !== data.linkedApps.length ||
    selected.some((v) => !data.linkedApps.includes(v));

  const toggle = (app: LinkedApp) =>
    setSelected((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );

  const handleSave = async () => {
    if (!dirty || empty || saving) return;
    setSaving(true);
    try {
      await update({ linkedApps: selected });
      toast.show(C.saved);
    } catch {
      toast.show(C.saveFailed, { icon: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout title={C.title} gap={12}>
      <Intro>
        <HeaderRow>
          <Heading accessibilityRole="header">{C.heading}</Heading>
        </HeaderRow>
        <HeaderRow>
          <Description>{C.description}</Description>
        </HeaderRow>
      </Intro>

      <List>
        <AllBox
          onPress={() => setSelected(allOn ? [] : ALL)}
          accessibilityRole="checkbox"
          accessibilityLabel={C.all}
          accessibilityState={{ checked: allOn }}
        >
          <Hidden
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Checkbox
              label=""
              checked={allOn}
              onChange={() => setSelected(allOn ? [] : ALL)}
            />
          </Hidden>
          <AllLabel>{C.all}</AllLabel>
        </AllBox>
        {LINKED_APP_OPTIONS.map((app, index) => {
          const checked = selected.includes(app.value);
          return (
            <Item key={app.value}>
              {index > 0 && <Divider />}
              <AppRow
                onPress={() => toggle(app.value)}
                accessibilityRole="checkbox"
                accessibilityLabel={app.label}
                accessibilityState={{ checked }}
              >
                <Hidden
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <Checkbox
                    label=""
                    checked={checked}
                    onChange={() => toggle(app.value)}
                  />
                </Hidden>
                <AppIcon source={app.icon} />
                <AppName>{app.label}</AppName>
              </AppRow>
            </Item>
          );
        })}
      </List>

      <Actions>
        <Button
          variant={dirty && !empty ? "primary" : "secondary"}
          fullWidth
          onPress={handleSave}
          disabled={saving}
          accessibilityState={{
            disabled: !dirty || empty || saving,
            busy: saving,
          }}
          accessibilityHint={empty ? C.emptyHint : undefined}
        >
          {C.save}
        </Button>
      </Actions>
    </SettingsLayout>
  );
};

// 시안: 소제목(16/24 Bold)·설명(13 Regular) 줄 높이 26, 좌우 10
const Intro = styled.View``;

const HeaderRow = styled.View`
  justify-content: center;
  min-height: 26px;
  padding: 0px 10px;
`;

const Heading = styled.Text`
  ${({ theme }) => theme.fonts.titleSubsection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodySmallRelaxed};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const List = styled.View`
  align-items: center;
`;

// 전체 선택 상자: 폭 308(카드보다 양옆 10 안쪽), 좌우 20·위아래 10, 체크와 글자 사이 12
const AllBox = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 2px;
  align-self: stretch;
  min-height: 48px;
  margin: 0px 10px;
  padding: 10px 20px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.stateSelectedBg};
`;

const AllLabel = styled.Text`
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Item = styled.View`
  align-self: stretch;
`;

// 앱 줄: 높이 72, 안쪽 12, 체크 · 아이콘 44 · 이름 사이 12 (Checkbox 안쪽 간격 10 + gap 2)
const AppRow = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 2px;
  height: 72px;
  padding: 12px;
`;

const AppIcon = styled.Image`
  width: 44px;
  height: 44px;
  margin-right: 10px;
  border-radius: 10px;
`;

const AppName = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// 앱 줄 사이 구분선 (시안 폭 306)
const Divider = styled.View`
  height: 1px;
  margin: 0px 11px;
  background-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Hidden = styled.View``;

const Actions = styled.View`
  padding: 20px 10px;
`;

export default LinkedAppsSettings;
