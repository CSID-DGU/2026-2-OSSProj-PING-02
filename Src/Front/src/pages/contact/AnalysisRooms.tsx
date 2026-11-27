import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { FooterLayout } from "@core/ui/layout";
import { useToast } from "@core/ui/toast";
import ContactListControls from "@components/contact/ContactListControls";
import ConversationRow from "@components/contact/ConversationRow";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import {
  filterConversations,
  type ContactTab,
  type RelationFilter,
} from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { services, type ConversationSummary } from "@services";

// 05 연락 D02 분석 대화방 관리 (D01 톱니에서)
// 체크 = 분석함. 끈 방은 연락 목록·홈에서 빠짐. 저장하기를 눌러야 반영 → 토스트 + 돌아가기
// 저장하지 않고 뒤로가기면 확인 없이 나감 (팀 확정)
// 아래 버튼 2개는 고정, 목록만 스크롤 (FooterLayout)
// "전체 선택": 지금 보이는(탭·관계 필터) 방을 모두 선택. 모두 선택돼 있으면 "전체 해제" (디자이너 확인)
type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: ConversationSummary[] };

const AnalysisRooms = () => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<ContactTab>("all");
  const [relation, setRelation] = useState<RelationFilter>("all");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    Promise.all([
      services.conversation.list({ includeAnalysisOff: true }),
      services.conversation.getAnalysisOffIds(),
    ])
      .then(([items, offIds]) => {
        if (!alive) return;
        const off = new Set(offIds);
        setEnabled(
          new Set(
            items.map(i => i.conversation.id).filter(id => !off.has(id))
          )
        );
        setState({ status: "ready", items });
      })
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const goBack = () => navigation.goBack();

  if (state.status !== "ready") {
    return (
      <TabScreen title="분석 대화방 관리" onBack={goBack} divider={false} background="surface">
        <Center>
          {state.status === "loading" ? (
            <ActivityIndicator
              color={theme.colors.iconSubtle}
              accessibilityLabel="대화방을 불러오는 중"
            />
          ) : (
            <Notice
              tone="danger"
              align="center"
              title="대화방을 불러오지 못했어요"
            >
              <Button variant="text" onPress={() => setAttempt(n => n + 1)}>
                다시 불러오기
              </Button>
            </Notice>
          )}
        </Center>
      </TabScreen>
    );
  }

  const { items } = state;
  const data = filterConversations(items, tab, relation);
  const allSelected =
    data.length > 0 && data.every(i => enabled.has(i.conversation.id));

  const toggle = (id: string) =>
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setEnabled(prev => {
      const next = new Set(prev);
      data.forEach(i =>
        allSelected
          ? next.delete(i.conversation.id)
          : next.add(i.conversation.id)
      );
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await services.conversation.setAnalysisOffIds(
        items.map(i => i.conversation.id).filter(id => !enabled.has(id))
      );
      toast.show("저장했어요");
      navigation.goBack();
    } catch {
      setSaving(false);
      toast.show("저장하지 못했어요. 다시 시도해 주세요");
    }
  };

  return (
    <TabScreen title="분석 대화방 관리" onBack={goBack} divider={false} background="surface">
      <FooterLayout
        // 시안: 버튼 사이 5 · 아래 탭바까지 15
        bottomInset={3}
        // Figma와 다르게 간 부분(팀 확정): 시안은 목록이 버튼 뒤로 비치지만,
        // 목록 글자가 버튼과 겹쳐 읽기 힘들어 버튼 영역에 본문과 같은 흰 바탕을 둠
        background="surface"
        footer={
          <Actions>
            <Button
              onPress={save}
              disabled={saving}
              fullWidth
              typo="labelButtonCompact"
            >
              변경 사항 저장하기
            </Button>
            <Button
              variant="secondary"
              onPress={toggleAll}
              disabled={saving || data.length === 0}
              fullWidth
              typo="labelButtonCompact"
              // 시안 보조 버튼 바탕은 surfaceSeed (core secondary의 actionSecondaryBg보다 연함)
              style={{ backgroundColor: theme.colors.surfaceSeed }}
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </Button>
          </Actions>
        }
      >
        <FlatList
          data={data}
          keyExtractor={item => item.conversation.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ContactListControls
              tab={tab}
              onTabChange={setTab}
              laterCount={items.filter(i => i.deferred).length}
              relation={relation}
              onRelationChange={setRelation}
            />
          }
          ListEmptyComponent={
            <Empty>
              <Notice align="center" title="여기에 보일 대화방이 없어요" />
            </Empty>
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              checked={enabled.has(item.conversation.id)}
              onPress={() => toggle(item.conversation.id)}
            />
          )}
        />
      </FooterLayout>
    </TabScreen>
  );
};

const styles = StyleSheet.create({ list: { flexGrow: 1 } });

const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

const Empty = styled.View`
  padding: 24px 20px;
`;

const Actions = styled.View`
  gap: 5px;
`;

export default AnalysisRooms;
