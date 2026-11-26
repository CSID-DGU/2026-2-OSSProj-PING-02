import { useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription } from "@core/ui/card";
import { ChoiceGroup } from "@core/ui/choice";
import AuthIntro from "@components/auth/AuthIntro";
import ConversationCard from "@components/contact/ConversationCard";
import ModelNotice from "@components/contact/ModelNotice";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { formatRemind } from "@constants/contact";
import { useOpenConversation } from "@hooks/useConversationDetail";
import { useConversations } from "@hooks/useConversations";
import type { ConversationSummary } from "@services";
import * as s from "./ContactsTab_styled";

// 04 / 07 연락 목록 + 12 미뤄둔 답장("나중에" 필터)
// 와이어프레임의 구조·문구를 따르고 색·컴포넌트는 design-system
type Filter = "all" | "important" | "later";

const FILTER_OPTIONS: { label: string; value: Filter }[] = [
  { label: "전체", value: "all" },
  { label: "중요", value: "important" },
  { label: "나중에", value: "later" },
];

const EMPTY_TEXT: Record<Filter, { title: string; body: string }> = {
  all: {
    title: "아직 모인 연락이 없어요",
    body: "선택한 앱에 새 알림이 오면 여기에 조용히 모아 둘게요.",
  },
  important: {
    title: "지금 중요한 연락은 없어요",
    body: "편한 마음으로 다른 연락을 둘러봐도 괜찮아요.",
  },
  later: {
    title: "미뤄둔 답장이 없어요",
    body: "연락 상세에서 '나중에 답하기'를 고르면 여기에 보관해요.",
  },
};

// 목록 맨 앞(머리말)부터 보이는 첫 항목의 위치를 지킴 (FlatList는 머리말이 0번)
const MAINTAIN_POSITION = { minIndexForVisible: 0 };

// 중요: 경조사·마감, 나를 언급한 질문 등 분석에서 중요로 고른 연락 (모델이 있어야 판단 가능)
const isImportant = (item: ConversationSummary) =>
  item.analysis.status === "done" &&
  !item.replied &&
  (item.analysis.priority === "high" ||
    (item.analysis.mentionsMe && item.analysis.needsReply));

const ContactsTab = ({ title }: { title: string }) => {
  const theme = useTheme();
  const { state, modelReady, retry } = useConversations();
  const [filter, setFilter] = useState<Filter>("all");

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
  const later = items.filter(i => i.deferred);
  const data =
    filter === "later"
      ? later
      : filter === "important"
      ? modelReady
        ? items.filter(isImportant)
        : []
      : items;

  const header = (
    <s.Header>
      <AuthIntro
        title="연락"
        // TODO(Figma 문구 확인): 시안 "중요도보다 부담이 적은 순서로도 볼 수 있어요."
        // 정렬 기능이 아직 없어 약속하지 않는 문구로 둠
        description="편한 순서대로 천천히 살펴봐도 괜찮아요."
      />
      <ModelNotice />
      <ChoiceGroup
        shape="chip"
        options={FILTER_OPTIONS.map(o => ({
          ...o,
          label:
            o.value === "later" && later.length > 0
              ? `${o.label} ${later.length}`
              : o.label,
        }))}
        value={filter}
        onChange={setFilter}
      />
      {filter === "later" && later.length > 0 && (
        <Notice align="center" title="기한이 지나도 재촉하지 않아요">
          다시 볼 때가 되면 조용히 한 번만 알려 드려요.
        </Notice>
      )}
    </s.Header>
  );

  const empty =
    filter === "important" && !modelReady ? (
      <s.Muted>가리기 모델을 받으면 중요한 연락을 골라 드려요.</s.Muted>
    ) : (
      <Notice align="center" title={EMPTY_TEXT[filter].title}>
        {EMPTY_TEXT[filter].body}
      </Notice>
    );

  return (
    <TabScreen title={title}>
      <FlatList
        data={data}
        keyExtractor={item => item.conversation.id}
        // 새 메시지로 목록이 자동으로 바뀔 때(#71) 보던 자리를 유지
        // 맨 위(머리말이 보임)면 새 카드가 머리말 아래에 보이고, 내려서 보는 중이면 보던 카드가 제자리에 있음
        maintainVisibleContentPosition={MAINTAIN_POSITION}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) =>
          filter === "later" && item.deferred ? (
            // 12 미뤄둔 답장 카드: "이름 · N일 뒤 다시 보기" + 무엇에 대한 답장인지
            <Card
              onPress={() => open(item.conversation)}
              accessibilityLabel={`${item.conversation.title}, ${formatRemind(
                item.deferred.remindAt
              )}. ${item.deferred.topic}`}
              accessibilityHint="눌러서 자세히 봐요"
            >
              <s.TitleRow>
                <s.Title numberOfLines={1}>{item.conversation.title}</s.Title>
                <s.Sub>{`· ${formatRemind(item.deferred.remindAt)}`}</s.Sub>
              </s.TitleRow>
              <CardDescription numberOfLines={2}>
                {item.deferred.topic}
              </CardDescription>
            </Card>
          ) : (
            <ConversationCard
              item={item}
              modelReady={modelReady}
              onPress={() => open(item.conversation)}
            />
          )
        }
      />
    </TabScreen>
  );
};

export default ContactsTab;
