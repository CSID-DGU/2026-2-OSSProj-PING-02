import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { Checkbox } from "@core/ui/checkbox";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import Notice from "@components/onboarding/Notice";
import SkipButton from "@components/onboarding/SkipButton";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { services, type Contact } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./ContactsSelect_styled";

type Load = "loading" | "error" | "ready";

// 09 / 연락처 친구 선택: 전체 연락처를 스크롤 목록으로, 전체 선택이 기본값
const ContactsSelect = () => {
  const theme = useTheme();
  const { navigation } = useOnboardingStep("ContactsSelect");
  const { data, update } = useOnboarding();
  const [load, setLoad] = useState<Load>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadContacts = useCallback(async () => {
    setLoad("loading");
    try {
      const list = await services.contacts.getAll();
      setContacts(list);
      // 이전에 고른 적이 있으면 그 선택을, 처음이면 전체 선택
      const saved = new Set(data.friends.map(f => f.id));
      setSelected(
        saved.size > 0
          ? new Set(list.filter(c => saved.has(c.id)).map(c => c.id))
          : new Set(list.map(c => c.id))
      );
      setLoad("ready");
    } catch {
      setLoad("error");
    }
    // 처음 열 때 한 번만 불러옴 (저장된 친구 목록은 그때 기준)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const count = selected.size;
  const allSelected = contacts.length > 0 && count === contacts.length;

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(contacts.map(c => c.id)));

  const handleAdd = () => {
    if (count === 0) return;
    update({ friends: contacts.filter(c => selected.has(c.id)) }).catch(
      () => {}
    );
    navigation.navigate("FriendsReady");
  };

  // 연락처가 없거나 못 불러오면 친구 목록 없이 11로
  const handleSkip = () => {
    update({ friends: [] }).catch(() => {});
    navigation.navigate("AiMemory");
  };

  const header = (
    <s.Header>
      <AuthIntro
        variant="onboarding"
        title={"친구로 추가할 연락처를\n선택해요"}
        description={
          "전체 선택이 기본값이에요. 원하지 않는 연락처는\n체크를 해제할 수 있어요"
        }
      />
      {load === "ready" && contacts.length > 0 && (
        <Card
          variant={allSelected ? "selected" : "default"}
          style={s.rowStyle}
        >
          <Checkbox
            label="전체 선택"
            checked={allSelected}
            onChange={toggleAll}
            emphasis
          />
          <s.SubPress
            onPress={toggleAll}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <s.SubText>
              {allSelected
                ? `연락처 ${contacts.length}명 모두 선택됨`
                : `연락처 ${contacts.length}명 중 ${count}명 선택됨`}
            </s.SubText>
          </s.SubPress>
        </Card>
      )}
      {load === "loading" && (
        <s.Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="연락처를 불러오는 중"
          />
        </s.Center>
      )}
      {load === "error" && (
        <Notice tone="danger" align="center" title="연락처를 불러오지 못했어요">
          <Button variant="text" onPress={loadContacts}>
            다시 불러오기
          </Button>
        </Notice>
      )}
      {load === "ready" && contacts.length === 0 && (
        <Notice align="center" title="가져올 연락처가 없어요">
          메신저 알림이 오면 친구를 하나씩 추가할 수 있어요
        </Notice>
      )}
    </s.Header>
  );

  const showSkip = load !== "ready" || contacts.length === 0 || count === 0;

  return (
    <AuthLayout
      scrollable={false}
      footer={
        <>
          {showSkip && load !== "loading" && (
            <SkipButton onPress={handleSkip}>
              {contacts.length === 0 ? "다음" : "나중에 할게요"}
            </SkipButton>
          )}
          <Button
            variant="primary"
            fullWidth
            onPress={handleAdd}
            disabled={count === 0}
            accessibilityHint={
              count === 0 ? "연락처를 한 명 이상 고르면 누를 수 있어요" : undefined
            }
          >
            {`선택한 ${count}명 추가`}
          </Button>
        </>
      }
    >
      <FlatList
        data={load === "ready" ? contacts : []}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Card style={s.rowStyle}>
            <Checkbox
              label={item.name}
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              emphasis
            />
            {/* 전화번호를 눌러도 선택되게. 스크린리더는 체크박스 하나만 읽음 */}
            <s.SubPress
              onPress={() => toggle(item.id)}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            >
              <s.SubText>{item.phone}</s.SubText>
            </s.SubPress>
          </Card>
        )}
      />
    </AuthLayout>
  );
};

export default ContactsSelect;
