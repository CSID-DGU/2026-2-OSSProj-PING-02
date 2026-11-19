import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription, CardMeta, CardTitle } from "@core/ui/card";
import AuthIntro from "@components/auth/AuthIntro";
import ConversationCard from "@components/contact/ConversationCard";
import ModelNotice from "@components/contact/ModelNotice";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL, PRIORITY_TAG_LABEL } from "@constants/contact";
import type { MainTabKey } from "@constants/tabs";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useOpenConversation } from "@hooks/useConversationDetail";
import { useConversations } from "@hooks/useConversations";
import {
  services,
  type AnalysisTag,
  type ConversationSummary,
} from "@services";
import * as s from "./HomeTab_styled";

// 홈 (시안 없음 → design-system 토큰으로 임시 구성, TODO(디자인): 시안 오면 맞춤)
// 꼭 챙길 연락(최대 3) · 1:1 연락 요약 · 접힌 단톡 요약 · 오늘의 작은 행동
const MUST_CHECK_MAX = 3;
const DIRECT_MAX = 3;
// 꼭 챙길 연락 순서: 경조사 → 마감·약속 임박 → 나머지(오래 답하지 못한 중요한 연락 등)
const TAG_RANK: AnalysisTag[] = ["occasion", "deadline"];
const rank = (item: ConversationSummary) => {
  const i = TAG_RANK.findIndex(t => item.analysis.tags.includes(t));
  return i === -1 ? TAG_RANK.length : i;
};

type SmallAction =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; conversationId: string | null; text: string };

type Section = "intro" | "model" | "mustCheck" | "direct" | "group" | "action";

interface HomeTabProps {
  title: string;
  onOpenTab: (key: MainTabKey) => void;
}

const HomeTab = ({ title, onOpenTab }: HomeTabProps) => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const { state, modelReady, retry } = useConversations();
  const [groupOpen, setGroupOpen] = useState(false);
  const [action, setAction] = useState<SmallAction>({ status: "loading" });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      services.conversation
        .getSmallAction()
        .then(a => alive && setAction({ status: "ready", ...a }))
        .catch(() => alive && setAction({ status: "error" }));
      return () => {
        alive = false;
      };
    }, [])
  );

  // 단톡은 09-C로, 1:1은 08 연락 상세로
  const open = useOpenConversation();

  if (state.status === "loading") {
    return (
      <TabScreen title={title}>
        <s.Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="연락을 불러오는 중"
          />
        </s.Center>
      </TabScreen>
    );
  }

  if (state.status === "error") {
    return (
      <TabScreen title={title}>
        <s.Center>
          <Notice tone="danger" align="center" title="연락을 불러오지 못했어요">
            <Button variant="text" onPress={retry}>
              다시 불러오기
            </Button>
          </Notice>
        </s.Center>
      </TabScreen>
    );
  }

  const { items } = state;
  const mustCheck = modelReady
    ? items
        .filter(
          i =>
            i.analysis.status === "done" &&
            i.analysis.priority === "high" &&
            i.analysis.needsReply &&
            !i.replied &&
            !i.deferred
        )
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, MUST_CHECK_MAX)
    : [];
  const mustIds = new Set(mustCheck.map(i => i.conversation.id));
  const directAll = items.filter(
    i => i.conversation.kind === "direct" && !mustIds.has(i.conversation.id)
  );
  const direct = directAll.slice(0, DIRECT_MAX);
  const groups = items.filter(i => i.conversation.kind === "group");
  const groupMentions = modelReady
    ? groups.filter(g => g.analysis.mentionsMe).length
    : 0;

  const sections: Section[] =
    items.length === 0
      ? ["intro", "model"]
      : ["intro", "model", "mustCheck", "direct", "group", "action"];

  const renderSection = (section: Section) => {
    switch (section) {
      case "intro":
        return (
          <AuthIntro
            title="오늘의 연락"
            description="천천히 살펴봐도 괜찮아요. 답장은 준비됐을 때 해요."
          />
        );

      case "model":
        return items.length === 0 ? (
          <>
            <ModelNotice />
            <Notice align="center" title="아직 모인 연락이 없어요">
              선택한 앱에 새 알림이 오면 여기에 조용히 모아 둘게요.
            </Notice>
          </>
        ) : (
          <ModelNotice />
        );

      case "mustCheck":
        return (
          <s.Section>
            <s.SectionTitle accessibilityRole="header">
              꼭 챙길 연락
            </s.SectionTitle>
            <s.SectionNote>
              급하지 않아도, 놓치면 아쉬울 수 있는 연락이에요.
            </s.SectionNote>
            {!modelReady ? (
              <s.Muted>가리기 모델을 받으면 여기서 골라 드려요.</s.Muted>
            ) : mustCheck.length === 0 ? (
              <s.Muted>지금 꼭 챙길 연락은 없어요.</s.Muted>
            ) : (
              mustCheck.map(item => {
                const tag = item.analysis.tags.find(t => PRIORITY_TAG_LABEL[t]);
                return (
                  <Card
                    key={item.conversation.id}
                    variant="highlight"
                    onPress={() => open(item.conversation)}
                    accessibilityHint="눌러서 자세히 봐요"
                  >
                    <CardTitle numberOfLines={1}>
                      {item.conversation.title}
                    </CardTitle>
                    <CardDescription>
                      {item.analysis.highlight ?? item.analysis.summary}
                    </CardDescription>
                    <CardMeta>
                      {[
                        tag && PRIORITY_TAG_LABEL[tag],
                        APP_LABEL[item.conversation.app],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </CardMeta>
                  </Card>
                );
              })
            )}
          </s.Section>
        );

      case "direct":
        return (
          <s.Section>
            <s.SectionHeader>
              <s.SectionTitle accessibilityRole="header">
                1:1 연락
              </s.SectionTitle>
              {directAll.length > DIRECT_MAX && (
                <Button variant="text" onPress={() => onOpenTab("contacts")}>
                  모두 보기
                </Button>
              )}
            </s.SectionHeader>
            {direct.length === 0 ? (
              <s.Muted>새로 온 1:1 연락은 없어요.</s.Muted>
            ) : (
              direct.map(item => (
                <ConversationCard
                  key={item.conversation.id}
                  item={item}
                  modelReady={modelReady}
                  onPress={() => open(item.conversation)}
                />
              ))
            )}
          </s.Section>
        );

      case "group":
        return (
          <s.Section>
            <s.SectionTitle accessibilityRole="header">단톡</s.SectionTitle>
            {groups.length === 0 ? (
              <s.Muted>새로 온 단톡은 없어요.</s.Muted>
            ) : (
              <>
                {/* 접힌 요약: 누르면 펼침. Card의 접근성 상태 대신 펼침 상태를 직접 알림 */}
                <s.FoldPress
                  onPress={() => setGroupOpen(o => !o)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: groupOpen }}
                  accessibilityLabel={`단톡 ${groups.length}개${
                    groupMentions ? `, 나를 언급한 곳 ${groupMentions}개` : ""
                  }`}
                  accessibilityHint={
                    groupOpen ? "눌러서 접어요" : "눌러서 펼쳐요"
                  }
                >
                  <Card>
                    <s.FoldRow>
                      <s.FoldTexts>
                        <CardTitle>{`단톡 ${groups.length}개`}</CardTitle>
                        <CardDescription>
                          {groupMentions
                            ? `나를 언급한 곳이 ${groupMentions}개 있어요`
                            : "나를 찾는 이야기는 없어요"}
                        </CardDescription>
                      </s.FoldTexts>
                      <s.FoldLabel>{groupOpen ? "접기" : "펼치기"}</s.FoldLabel>
                    </s.FoldRow>
                  </Card>
                </s.FoldPress>
                {groupOpen &&
                  groups.map(item => (
                    <ConversationCard
                      key={item.conversation.id}
                      item={item}
                      modelReady={modelReady}
                      onPress={() => open(item.conversation)}
                    />
                  ))}
              </>
            )}
          </s.Section>
        );

      case "action":
        return (
          <s.Section>
            <s.SectionTitle accessibilityRole="header">
              오늘의 작은 행동
            </s.SectionTitle>
            {action.status === "loading" ? (
              <ActivityIndicator
                color={theme.colors.iconSubtle}
                accessibilityLabel="작은 행동을 고르는 중"
              />
            ) : action.status === "error" ? (
              <s.Muted>오늘은 쉬어 가도 괜찮아요.</s.Muted>
            ) : (
              <Card>
                <CardDescription style={s.noTop}>{action.text}</CardDescription>
                {action.conversationId && (
                  <s.ActionRow>
                    <Button
                      variant="text"
                      onPress={() =>
                        navigation.navigate("ConversationDetail", {
                          conversationId: action.conversationId!,
                        })
                      }
                    >
                      한마디 건네 볼게요
                    </Button>
                  </s.ActionRow>
                )}
              </Card>
            )}
          </s.Section>
        );
    }
  };

  return (
    <TabScreen title={title}>
      <FlatList
        data={sections}
        keyExtractor={key => key}
        renderItem={({ item }) => renderSection(item)}
        contentContainerStyle={s.listContent}
      />
    </TabScreen>
  );
};

export default HomeTab;
