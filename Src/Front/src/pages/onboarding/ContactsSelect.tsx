import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList } from "react-native";
import { Button } from "@core/ui/button";
import { Checkbox } from "@core/ui/checkbox";
import { SearchIcon } from "@core/ui/icon";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import FriendAvatar from "@components/friend/FriendAvatar";
import Illustration from "@components/onboarding/Illustration";
import Notice from "@components/onboarding/Notice";
import ProgressBar from "@components/onboarding/ProgressBar";
import SkipButton from "@components/onboarding/SkipButton";
import { ONBOARDING_IMAGES } from "@constants/onboardingImages";
import { useOnboardingStep } from "@hooks/useOnboardingStep";
import { services, type Contact } from "@services";
import { useOnboarding } from "@stores/OnboardingProvider";
import * as s from "./ContactsSelect_styled";

type Load = "loading" | "error" | "ready";

// 08 불러오는 중: 막대가 천천히 차다가(최대 90%) 다 받으면 꽉 채우고 잠깐 보여 준 뒤 09로 (팀 확정)
const PROGRESS_TICK_MS = 120;
const PROGRESS_CAP = 0.9;
const PROGRESS_STEP = 0.06; // 남은 거리의 6%씩
const FULL_HOLD_MS = 300;

// 08 연락처 불러오는 중 → 09 연락처 친구 선택 (Figma 03 온보딩 08·09, 720px ÷2)
// 08: 제목 · 설명 · 연락처 책 · 진행 막대(206×10). 시안대로 화살표 없음, 안드로이드 뒤로가기는 07로
//     실패하면 이 화면에 Notice + "다시 불러오기" (팀 확정). 이때는 화살표를 보여 07로 돌아갈 수 있게
// 09: 제목 · 설명 · 검색창 · 전체 선택 줄(연락처 수) · 줄(체크 · 아바타 · 이름 / 번호) · 아래 "N명 친구로 저장하기"
// - 전체 선택은 검색과 상관없이 전체 연락처 기준, 검색은 보이는 목록만 거름 (팀 확정)
// - 0명이면 저장하기 비활성 + 아래 "건너뛰기" (팀 확정, 텍스트 버튼은 주 버튼 아래)
// 글자 (디자이너 확인): 제목 headingOnboarding 22/31 · 이름 titleSection 14/20 · 번호 captionDense 11/12
//   · 전체 선택 bodyCompact 13/15 · 연락처 수 captionRegular 12/17
const ContactsSelect = () => {
  const { navigation } = useOnboardingStep("ContactsSelect");
  const { data, update } = useOnboarding();
  const [load, setLoad] = useState<Load>("loading");
  const [progress, setProgress] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const alive = useRef(true);

  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );

  // 불러오는 동안 막대를 조금씩 채움
  useEffect(() => {
    if (load !== "loading") return;
    const timer = setInterval(() => {
      setProgress(p =>
        p >= PROGRESS_CAP ? p : p + (PROGRESS_CAP - p) * PROGRESS_STEP
      );
    }, PROGRESS_TICK_MS);
    return () => clearInterval(timer);
  }, [load]);

  const loadContacts = useCallback(async () => {
    setLoad("loading");
    setProgress(0);
    try {
      const list = await services.contacts.getAll();
      if (!alive.current) return;
      setContacts(list);
      // 이전에 고른 적이 있으면 그 선택을, 처음이면 전체 선택
      const saved = new Set(data.friends.map(f => f.id));
      setSelected(
        saved.size > 0
          ? new Set(list.filter(c => saved.has(c.id)).map(c => c.id))
          : new Set(list.map(c => c.id))
      );
      // 다 받으면 꽉 채우고 잠깐 보여 준 뒤 09
      setProgress(1);
      await new Promise<void>(resolve => setTimeout(resolve, FULL_HOLD_MS));
      if (alive.current) setLoad("ready");
    } catch {
      if (alive.current) setLoad("error");
    }
    // 처음 열 때 한 번만 불러옴 (저장된 친구 목록은 그때 기준)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // 08 불러오는 중 · 실패
  if (load !== "ready") {
    const failed = load === "error";
    return (
      <AuthLayout backOnly={failed} centered gap={24}>
        <AuthIntro
          variant="onboarding"
          title="연락처를 불러오고 있어요"
          description="잠시 시간이 걸릴 수도 있어요"
        />
        <s.Book>
          <Illustration image={ONBOARDING_IMAGES.contactsBook} />
        </s.Book>
        {failed ? (
          <Notice tone="danger" align="center" title="연락처를 불러오지 못했어요">
            <Button variant="text" onPress={loadContacts}>
              다시 불러오기
            </Button>
          </Notice>
        ) : (
          <s.Bar>
            <ProgressBar
              value={progress}
              accessibilityLabel="연락처를 불러오는 중"
            />
          </s.Bar>
        )}
      </AuthLayout>
    );
  }

  const count = selected.size;
  const allSelected = contacts.length > 0 && count === contacts.length;
  const q = query.trim();
  const digits = q.replace(/\D/g, "");
  const shown = q
    ? contacts.filter(
        c =>
          c.name.includes(q) ||
          (digits.length > 0 && c.phone.replace(/\D/g, "").includes(digits))
      )
    : contacts;

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

  // 0명이거나 연락처가 없으면 친구 목록 없이 11로
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
      {contacts.length === 0 ? (
        // TODO(디자이너 공유): 연락처가 하나도 없을 때 시안 없음 (예전 안내 유지)
        <Notice align="center" title="가져올 연락처가 없어요">
          메신저 알림이 오면 친구를 하나씩 추가할 수 있어요
        </Notice>
      ) : (
        <s.Controls>
          <s.Search>
            <s.SearchInput
              size="small"
              value={query}
              onChangeText={setQuery}
              placeholder="검색하기"
              accessibilityLabel="연락처 검색"
              returnKeyType="search"
            />
            <s.SearchIconBox pointerEvents="none">
              <SearchIcon />
            </s.SearchIconBox>
          </s.Search>
          <s.AllRow
            onPress={toggleAll}
            accessibilityRole="checkbox"
            accessibilityLabel={`전체 선택, 연락처 ${contacts.length}명 중 ${count}명 선택됨`}
            accessibilityState={{ checked: allSelected }}
          >
            <s.CheckSlot
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
            >
              <Checkbox checked={allSelected} onChange={() => {}} label="" />
            </s.CheckSlot>
            <s.AllLabel>전체 선택</s.AllLabel>
            <s.AllCount>{`${contacts.length}명`}</s.AllCount>
          </s.AllRow>
        </s.Controls>
      )}
    </s.Header>
  );

  return (
    <AuthLayout
      backOnly
      scrollable={false}
      footerDivider="none"
      footer={
        <>
          <Button
            variant="primary"
            fullWidth
            onPress={handleAdd}
            disabled={count === 0}
            accessibilityHint={
              count === 0
                ? "연락처를 한 명 이상 고르면 누를 수 있어요"
                : undefined
            }
          >
            {`${count}명 친구로 저장하기`}
          </Button>
          {count === 0 && (
            <SkipButton onPress={handleSkip}>건너뛰기</SkipButton>
          )}
        </>
      }
    >
      <FlatList
        data={shown}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          contacts.length > 0 ? (
            <s.NoResult>검색 결과가 없어요</s.NoResult>
          ) : undefined
        }
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const checked = selected.has(item.id);
          return (
            <s.Row
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${item.name}, ${item.phone}`}
              accessibilityState={{ checked }}
            >
              <s.CheckSlot
                pointerEvents="none"
                importantForAccessibility="no-hide-descendants"
              >
                <Checkbox checked={checked} onChange={() => {}} label="" />
              </s.CheckSlot>
              <FriendAvatar />
              <s.Texts>
                <s.Name numberOfLines={1}>{item.name}</s.Name>
                <s.Phone numberOfLines={1}>{item.phone}</s.Phone>
              </s.Texts>
            </s.Row>
          );
        }}
      />
    </AuthLayout>
  );
};

export default ContactsSelect;
