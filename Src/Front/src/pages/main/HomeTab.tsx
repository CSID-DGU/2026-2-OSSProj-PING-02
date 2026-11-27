import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import seed from "@assets/img/auth/seed.png";
import { Button } from "@core/ui/button";
import {
  ChatIcon,
  ChevronRightIcon,
  ClipboardIcon,
  GroupChatIcon,
  PersonAddIcon,
} from "@core/ui/icon";
import { isSameDay } from "@core/ui/calendar";
import EventCard from "@components/calendar/EventCard";
import HomeHero from "@components/home/HomeHero";
import NotificationBell from "@components/main/NotificationBell";
import Notice from "@components/onboarding/Notice";
import { LINKED_APP_OPTIONS } from "@constants/onboarding";
import type { MainTabKey } from "@constants/tabs";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useOpenConversation } from "@hooks/useConversationDetail";
import { useConversations } from "@hooks/useConversations";
import { useHomeHelp } from "@hooks/useHomeHelp";
import { services, type CalendarEvent, type ConversationSummary } from "@services";
import {
  selectGroupSummary,
  selectMustCheck,
  selectUpcomingEvent,
  summaryOf,
} from "../../utils/home";
import * as s from "./HomeTab_styled";

// 04 홈 (Figma 04 홈 최종 C01 기본 홈 · C08 홈 빈 상태)
// 로고 줄 · 오늘의 도움 수준 히어로 · 오늘 챙길 연락(최대 3, 최신순, 광고 제외) · 단체방 요약
// · 다가오는 일정 · 지금 확인하면 좋은 것(안부) · 빠른 기능
// C01에서 "지금 확인하면 좋은 것" 아래가 잘려 있어 C08의 안부 카드 + 빠른 기능 2개를 씀 (팀 확정)
interface HomeTabProps {
  onOpenTab: (key: MainTabKey) => void;
}

const APP_ICON = Object.fromEntries(
  LINKED_APP_OPTIONS.map(app => [app.value, app.icon])
);

const HomeTab = ({ onOpenTab }: HomeTabProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useAuthNavigation();
  const open = useOpenConversation();
  const { state, retry } = useConversations();
  const { mode } = useHomeHelp();
  const events = useUpcomingEvents();

  const openHelpLevel = () =>
    navigation.navigate("HomeHelpLevel", { current: mode ?? undefined });

  return (
    <s.Screen $top={insets.top}>
      <s.LogoRow>
        <s.LogoImage source={seed} accessible={false} />
        <s.LogoText accessibilityRole="header">말씨앗</s.LogoText>
        <s.BellSlot>
          {/* 안 읽은 알림 점은 알림 서비스(다른 팀원 담당)가 생기면 표시 */}
          <NotificationBell />
        </s.BellSlot>
      </s.LogoRow>
      <ScrollView contentContainerStyle={s.listContent}>
        <HomeHero mode={mode} onChange={openHelpLevel} />
        {state.status === "loading" ? (
          <LoadingState />
        ) : state.status === "error" ? (
          <s.Center>
            <Notice tone="danger" align="center" title="연락을 불러오지 못했어요">
              <Button variant="text" onPress={retry}>
                다시 불러오기
              </Button>
            </Notice>
          </s.Center>
        ) : state.items.length === 0 ? (
          <EmptyHome onOpenTab={onOpenTab} />
        ) : (
          <FilledHome
            items={state.items}
            event={events}
            onOpen={item => open(item.conversation)}
            onOpenTab={onOpenTab}
          />
        )}
      </ScrollView>
    </s.Screen>
  );
};

// 다가오는 일정: 화면에 올 때마다 다시 읽음 (실패하면 섹션을 숨김)
const useUpcomingEvents = () => {
  const [event, setEvent] = useState<CalendarEvent | undefined>();
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      services.calendar
        .list()
        .then(list => alive && setEvent(selectUpcomingEvent(list)))
        .catch(() => alive && setEvent(undefined));
      return () => {
        alive = false;
      };
    }, [])
  );
  return event;
};

const LoadingState = () => {
  const theme = useTheme();
  return (
    <s.Center>
      <ActivityIndicator
        color={theme.colors.iconSubtle}
        accessibilityLabel="연락을 불러오는 중"
      />
    </s.Center>
  );
};

// ── C01 기본 홈
interface FilledHomeProps {
  items: ConversationSummary[];
  event?: CalendarEvent;
  onOpen: (item: ConversationSummary) => void;
  onOpenTab: (key: MainTabKey) => void;
}

const FilledHome = ({ items, event, onOpen, onOpenTab }: FilledHomeProps) => {
  const mustCheck = selectMustCheck(items);
  const group = selectGroupSummary(items);
  // 2개씩 한 줄 (3번째 카드는 다음 줄 왼쪽)
  const rows = [mustCheck.slice(0, 2), mustCheck.slice(2)].filter(r => r.length);

  return (
    <>
      {mustCheck.length > 0 && (
        <>
          <s.SectionHeader $top={12}>
            <s.SectionTitle accessibilityRole="header">오늘 챙길 연락</s.SectionTitle>
            <SectionLink label="전체 보기" onPress={() => onOpenTab("contacts")} />
          </s.SectionHeader>
          {rows.map((row, index) => (
            <s.CardRow key={index} $top={index === 0 ? 13 : 12}>
              {row.map(item => (
                <s.ContactCard
                  key={item.conversation.id}
                  onPress={() => onOpen(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.conversation.title}, ${summaryOf(item)}`}
                >
                  <s.AppIcon
                    source={APP_ICON[item.conversation.app]}
                    accessible={false}
                  />
                  <s.ContactName numberOfLines={1}>
                    {item.conversation.title}
                  </s.ContactName>
                  <s.ContactSummary numberOfLines={2}>
                    {summaryOf(item)}
                  </s.ContactSummary>
                </s.ContactCard>
              ))}
              {row.length === 1 && <s.CardSpacer />}
            </s.CardRow>
          ))}
        </>
      )}

      {group && (
        <s.RowCard
          $variant="brown"
          $height={68}
          $top={12}
          $left={21}
          onPress={() => onOpen(group)}
          accessibilityRole="button"
          accessibilityLabel={`${group.conversation.title} 대화가 정리됐어요, ${group.analysis.summary}`}
        >
          <GroupChatIcon />
          <s.RowTexts $left={21}>
            <s.RowTitle $small numberOfLines={1}>
              {`${group.conversation.title} 대화가 정리됐어요`}
            </s.RowTitle>
            <s.RowDescription $top={3.5} numberOfLines={1}>
              {group.analysis.summary}
            </s.RowDescription>
          </s.RowTexts>
          <RowChevron />
        </s.RowCard>
      )}

      {event && (
        <>
          <s.SectionHeader>
            <s.SectionTitle accessibilityRole="header">다가오는 일정</s.SectionTitle>
            <SectionLink label="캘린더" onPress={() => onOpenTab("calendar")} />
          </s.SectionHeader>
          <EventCard
            event={event}
            tone={isSameDay(new Date(event.date), new Date()) ? "dark" : "default"}
            top={13}
            onPress={() => onOpenTab("calendar")}
          />
        </>
      )}

      <s.SectionHeader>
        <s.SectionTitle accessibilityRole="header">
          지금 확인하면 좋은 것
        </s.SectionTitle>
      </s.SectionHeader>
      <ReconnectCard top={13} onPress={() => onOpenTab("friends")} />
      <QuickActions onOpenTab={onOpenTab} />
    </>
  );
};

// ── C08 홈 빈 상태
const EmptyHome = ({ onOpenTab }: { onOpenTab: (key: MainTabKey) => void }) => (
  <>
    <s.SectionHeader $top={12}>
      <s.SectionTitle accessibilityRole="header">
        아직 모인 연락이 없어요
      </s.SectionTitle>
    </s.SectionHeader>
    <s.EmptyDescription>
      새 알림이 오면 필요한 연락부터 조용히 정리해드릴게요.
    </s.EmptyDescription>
    <ReconnectCard top={15.5} onPress={() => onOpenTab("friends")} />
    <QuickActions onOpenTab={onOpenTab} />
  </>
);

const SectionLink = ({ label, onPress }: { label: string; onPress: () => void }) => {
  const theme = useTheme();
  return (
    <s.LinkPress
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 14, bottom: 14, left: 8 }}
    >
      <s.LinkText>{label}</s.LinkText>
      <ChevronRightIcon size={15} color={theme.colors.textSecondary} />
    </s.LinkPress>
  );
};

// 줄 카드 오른쪽 ">" (시안: 7×12 선, iconSubtle)
const RowChevron = () => {
  const theme = useTheme();
  return <ChevronRightIcon size={21} color={theme.colors.iconSubtle} />;
};

// 오랜만에 안부 전하기 (C08) → 친구 탭
const ReconnectCard = ({ top, onPress }: { top: number; onPress: () => void }) => {
  const theme = useTheme();
  return (
    <s.RowCard
      $variant="white"
      $top={top}
      $left={24}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="오랜만에 안부 전하기"
    >
      <ChatIcon size={21} color={theme.colors.brandBrown} />
      <s.ReconnectTexts>
        <s.RowTitle>오랜만에 안부 전하기</s.RowTitle>
        {/* 안드로이드는 한글을 글자 단위로 줄바꿈해서 시안(낱말 단위) 위치에 직접 줄을 나눔 */}
        <s.RowDescription $top={3} $compact>
          {"오래 연락하지 못한 친구에게 보낼 첫 문장을\n준비해드려요"}
        </s.RowDescription>
      </s.ReconnectTexts>
      <RowChevron />
    </s.RowCard>
  );
};

// 빠른 기능 2개 (C08)
const QuickActions = ({ onOpenTab }: { onOpenTab: (key: MainTabKey) => void }) => (
  <>
    <s.SectionHeader>
      <s.SectionTitle accessibilityRole="header">빠른 기능</s.SectionTitle>
    </s.SectionHeader>
    <s.CardRow $top={12.5}>
      {/* TODO(05 연락): 긴 메시지 붙여넣기 동작은 05 연락 작업 때 정함 (팀 확정: 지금은 버튼만) */}
      <s.QuickCard accessibilityRole="button" accessibilityLabel="긴 메시지 붙여넣기">
        <ClipboardIcon />
        <s.QuickTitle>긴 메시지 붙여넣기</s.QuickTitle>
        <s.QuickDescription>요약과 답장 방향을 바로 확인해요</s.QuickDescription>
      </s.QuickCard>
      <s.QuickCard
        onPress={() => onOpenTab("friends")}
        accessibilityRole="button"
        accessibilityLabel="새 친구 확인"
      >
        <PersonAddIcon />
        <s.QuickTitle>새 친구 확인</s.QuickTitle>
        <s.QuickDescription>연결 대기 중인 친구를 살펴봐요</s.QuickDescription>
      </s.QuickCard>
    </s.CardRow>
  </>
);

export default HomeTab;
