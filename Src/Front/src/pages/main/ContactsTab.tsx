import { useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import ContactListControls from "@components/contact/ContactListControls";
import ConversationRow from "@components/contact/ConversationRow";
import LongMessageNotice from "@components/contact/LongMessageNotice";
import HomeHero from "@components/home/HomeHero";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import {
  filterConversations,
  formatRemind,
  type ContactTab,
  type RelationFilter,
} from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useOpenConversation } from "@hooks/useConversationDetail";
import { useConversations } from "@hooks/useConversations";
import { useHomeHelp } from "@hooks/useHomeHelp";
import * as s from "./ContactsTab_styled";

// 05 연락 D01 연락 목록 (Figma "05 연락 최종")
// 앱바: 탭 첫 화면이라 뒤로가기 없이 가운데 "연락" + 🔔, 구분선 없음
// 오늘의 도움 수준 카드(홈과 같음) → 탭 → 톱니·관계 필터 → 장문 안내 → 목록
const EMPTY_TEXT: Record<ContactTab, { title: string; body: string }> = {
  all: {
    title: "아직 모인 연락이 없어요",
    body: "선택한 앱에 새 알림이 오면 여기에 조용히 모아 둘게요.",
  },
  mustCare: {
    title: "지금 꼭 챙길 연락은 없어요",
    body: "편한 마음으로 다른 연락을 둘러봐도 괜찮아요.",
  },
  later: {
    title: "미뤄둔 답장이 없어요",
    body: "연락 상세에서 '나중에 답하기'를 고르면 여기에 보관해요.",
  },
};

const ContactsTab = ({ title }: { title: string }) => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const { state, retry } = useConversations();
  const { mode } = useHomeHelp();
  const [tab, setTab] = useState<ContactTab>("all");
  const [relation, setRelation] = useState<RelationFilter>("all");

  // 단톡은 09-C로, 1:1은 08 연락 상세로
  const open = useOpenConversation();

  if (state.status === "loading") {
    return (
      <TabScreen title={title} divider={false} background="surface">
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
      <TabScreen title={title} divider={false} background="surface">
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
  const laterCount = items.filter(i => i.deferred).length;
  const data = filterConversations(items, tab, relation);
  // 알림에 앞부분만 온 메시지 → 가장 최근 대화의 긴 메시지 보완(D04)으로
  const truncated = items.find(i => i.lastMessage.truncated);

  const header = (
    <>
      <s.HeroSlot>
        <HomeHero
          mode={mode}
          onChange={() =>
            navigation.navigate("HomeHelpLevel", { current: mode ?? undefined })
          }
        />
      </s.HeroSlot>
      <ContactListControls
        tab={tab}
        onTabChange={setTab}
        laterCount={laterCount}
        relation={relation}
        onRelationChange={setRelation}
        onSettings={() => navigation.navigate("AnalysisRooms")}
      />
      {truncated && (
        <s.NoticeSlot>
          <LongMessageNotice
            onPress={() =>
              navigation.navigate("TruncatedMessage", {
                conversationId: truncated.conversation.id,
              })
            }
          />
        </s.NoticeSlot>
      )}
    </>
  );

  const empty = (
    <s.Empty>
      <Notice align="center" title={EMPTY_TEXT[tab].title}>
        {EMPTY_TEXT[tab].body}
      </Notice>
    </s.Empty>
  );

  return (
    <TabScreen title={title} divider={false} background="surface">
      <FlatList
        data={data}
        keyExtractor={item => item.conversation.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() => open(item.conversation)}
            // 미뤄둔 답장 탭: 시간 자리에 "3일 뒤 다시 보기"
            meta={
              tab === "later" && item.deferred
                ? formatRemind(item.deferred.remindAt)
                : undefined
            }
          />
        )}
      />
    </TabScreen>
  );
};

export default ContactsTab;
