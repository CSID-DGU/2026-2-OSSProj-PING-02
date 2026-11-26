import { useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import HelpRow from "@components/home/HelpRow";
import HomeAppBar from "@components/home/HomeAppBar";
import { MODE_SCREENS } from "@constants/homeHelp";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useConversations } from "@hooks/useConversations";
import type { AppParamList } from "@routes/types";
import { selectDeferredToday, selectMustCheck } from "../../utils/home";
import * as s from "./Help_styled";

// 04 홈 C03 추천 선택 · C04 추천 수정 · C05 직접 쓰기 (같은 구성, 문구만 다름)
// 줄 3개 중 하나를 고르고 아래 버튼으로 이동 (팀 확정)
// - 꼭 챙길 연락 N개 / 미뤄둔 답장 → 연락 탭, 오랜만에 안부 전하기 → 친구 탭
// - 개수가 0인 줄은 숨김, 안부 줄은 항상 보임
// TODO(05 연락): 모드에 따라 답장 화면(후보 선택·뼈대 수정·직접 쓰기)을 바꾸는 일은 05 연락 작업에서
type RowKey = "mustCheck" | "deferred" | "reconnect";

const HelpMode = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "HomeHelpMode">>();
  const screen = MODE_SCREENS[params.mode];
  const { state } = useConversations();
  const [picked, setPicked] = useState<RowKey | null>(null);

  const items = state.status === "ready" ? state.items : [];
  const mustCheck = selectMustCheck(items);
  const deferred = selectDeferredToday(items);

  const rows: { key: RowKey; title: string; description: string }[] = [
    ...(mustCheck.length
      ? [
          {
            key: "mustCheck" as const,
            title: `꼭 챙길 연락 ${mustCheck.length}개`,
            description: mustCheck
              .map(i => i.analysis.highlight ?? i.conversation.title)
              .join(", "),
          },
        ]
      : []),
    ...(deferred.length
      ? [
          {
            key: "deferred" as const,
            title: "미뤄둔 답장",
            description: `오늘 다시 보기로 한 연락 ${deferred.length}개`,
          },
        ]
      : []),
    {
      key: "reconnect",
      title: "오랜만에 안부 전하기",
      description: "먼저 연락하고 싶은 친구에게 보낼 말을 추천받아요",
    },
  ];
  // 처음에는 맨 위 줄이 선택됨
  const selected = rows.some(r => r.key === picked) ? picked! : rows[0].key;

  const go = () =>
    navigation.navigate("Home", {
      screen: selected === "reconnect" ? "friends" : "contacts",
    });

  return (
    <s.Screen $top={insets.top}>
      <HomeAppBar title="오늘의 도움 수준" />
      <ScrollView contentContainerStyle={s.content}>
        <s.Title accessibilityRole="header">{screen.title}</s.Title>
        <s.Description $top={6 + screen.descriptionGap}>
          {screen.description}
        </s.Description>
        {state.status === "loading" ? (
          <s.Center>
            <ActivityIndicator
              color={theme.colors.iconSubtle}
              accessibilityLabel="연락을 불러오는 중"
            />
          </s.Center>
        ) : (
          <s.List $top={0} accessibilityRole="radiogroup">
            {rows.map(row => (
              <HelpRow
                key={row.key}
                title={row.title}
                description={row.description}
                selected={selected === row.key}
                onPress={() => setPicked(row.key)}
                divider
              />
            ))}
          </s.List>
        )}
        <s.Actions $gap={12}>
          <Button onPress={go} fullWidth typo="labelButtonCompact">
            {screen.action}
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              navigation.navigate("HomeHelpLevel", { current: params.mode })
            }
            fullWidth
            typo="labelButtonCompact"
            // 시안 보조 버튼 바탕은 surfaceSeed (core secondary의 actionSecondaryBg보다 연함)
            style={{ backgroundColor: theme.colors.surfaceSeed }}
          >
            모드 바꾸기
          </Button>
        </s.Actions>
      </ScrollView>
    </s.Screen>
  );
};

export default HelpMode;
