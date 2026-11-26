import { useState } from "react";
import { ScrollView } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import HelpRow from "@components/home/HelpRow";
import HomeAppBar from "@components/home/HomeAppBar";
import {
  DEFAULT_HELP_MODE,
  HELP_OPTIONS,
  type HelpMode,
} from "@constants/homeHelp";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useHomeHelp } from "@hooks/useHomeHelp";
import type { AppParamList } from "@routes/types";
import * as s from "./Help_styled";

// 04 홈 C02 오늘 상태 선택 (하루 한 번, 건너뛰어도 괜찮음)
// - 처음 선택: 오늘 고른 모드, 없으면 "추천을 수정할래요" (시안 C02 상태)
// - 이대로 시작: 저장 후 모드 화면(C03~C05). "오늘은 미루기"는 C06이 아직 없어 홈으로 (팀 확정)
// - 오늘은 건너뛰기: 오늘은 고르지 않음으로 저장하고 홈으로
const HelpLevel = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "HomeHelpLevel">>();
  const { save } = useHomeHelp();
  const [selected, setSelected] = useState<HelpMode>(
    params?.current ?? DEFAULT_HELP_MODE
  );

  const start = async () => {
    await save(selected);
    navigation.popToTop();
    if (selected !== "rest") {
      navigation.navigate("HomeHelpMode", { mode: selected });
    }
  };

  const skip = async () => {
    await save(null);
    navigation.popToTop();
  };

  return (
    <s.Screen $top={insets.top}>
      <HomeAppBar title="오늘의 도움 수준" />
      <ScrollView contentContainerStyle={s.content}>
        <s.Title accessibilityRole="header">
          오늘은 어느 정도 도움이 필요하세요?
        </s.Title>
        <s.Description $top={6}>
          {"정답은 없고 하루 한 번만 물어봐요.\n건너뛰어도 괜찮아요."}
        </s.Description>
        <s.List $top={6} accessibilityRole="radiogroup">
          {HELP_OPTIONS.map((option, index) => (
            <HelpRow
              key={option.mode}
              title={option.title}
              description={option.description}
              selected={selected === option.mode}
              onPress={() => setSelected(option.mode)}
              divider={index < HELP_OPTIONS.length - 1}
            />
          ))}
        </s.List>
        <s.Actions $gap={13}>
          <Button onPress={start} fullWidth typo="labelButtonCompact">
            이대로 시작
          </Button>
          <Button
            variant="secondary"
            onPress={skip}
            fullWidth
            typo="labelButtonCompact"
            // 시안 보조 버튼 바탕은 surfaceSeed (core secondary의 actionSecondaryBg보다 연함)
            style={{ backgroundColor: theme.colors.surfaceSeed }}
          >
            오늘은 건너뛰기
          </Button>
        </s.Actions>
      </ScrollView>
    </s.Screen>
  );
};

export default HelpLevel;
