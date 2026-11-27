import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { Checkbox } from "@core/ui/checkbox";
import { BottomSheet, BottomSheetActions } from "@core/ui/sheet";
import {
  FRIEND_APP_ICON,
  formatFriendTime,
  matchesFriendQuery,
} from "@constants/friend";
import { appsOf, type FriendSummary } from "@services";
import FriendAvatar from "./FriendAvatar";
import FriendSearchBar from "./FriendSearchBar";

// 06 친구 E04-1 기존 친구에게 연결 (720px ÷2)
// 제목 → 검색창 → 줄(체크 · 아바타 44 · 이름 / 최근 대화 주제 · 시간 / 메신저 로고) → 연결하기 · 취소
// 한 명만 고름 (체크 모양이지만 라디오처럼 동작, 스크린리더도 radio)
// 쓰는 곳: E02 "다른 친구에게 연결하기", E03-3/4 "다른 친구에게 연결", E03-1 "연결 안 됨" 앱 줄
interface ConnectFriendSheetProps {
  visible: boolean;
  title: string;
  items: FriendSummary[];
  onConfirm: (item: FriendSummary) => void;
  onClose: () => void;
}

const ConnectFriendSheet = ({
  visible,
  title,
  items,
  onConfirm,
  onClose,
}: ConnectFriendSheetProps) => {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();

  // 열 때마다 처음 상태로
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setPicked(undefined);
  }, [visible]);

  const shown = items.filter(item => matchesFriendQuery(item, query));
  const selected = items.find(item => item.person.id === picked);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <BottomSheetActions
          confirmLabel="연결하기"
          confirmDisabled={!selected}
          onConfirm={() => selected && onConfirm(selected)}
          onCancel={onClose}
        />
      }
    >
      <FriendSearchBar value={query} onChangeText={setQuery} flush />
      <List>
        {/* TODO(디자이너 공유): 고를 친구가 없을 때·검색 결과가 없을 때 시안 없음 → 한 줄 안내 */}
        {shown.length === 0 && (
          <Empty>
            {items.length === 0 ? "연결할 친구가 아직 없어요" : "찾는 친구가 없어요"}
          </Empty>
        )}
        {shown.map(item => {
          const checked = item.person.id === picked;
          const time = item.lastContactAt ? formatFriendTime(item.lastContactAt) : null;
          return (
            <Row
              key={item.person.id}
              onPress={() => setPicked(item.person.id)}
              accessibilityRole="radio"
              accessibilityLabel={[item.person.displayName, item.lastTopic, time]
                .filter(Boolean)
                .join(", ")}
              accessibilityState={{ selected: checked }}
            >
              <CheckSlot pointerEvents="none" importantForAccessibility="no-hide-descendants">
                <Checkbox checked={checked} onChange={() => {}} label="" />
              </CheckSlot>
              <FriendAvatar />
              <Texts>
                <Name numberOfLines={1}>{item.person.displayName}</Name>
                {item.lastTopic ? (
                  <Topic numberOfLines={1}>{item.lastTopic}</Topic>
                ) : null}
              </Texts>
              <Side>
                {time ? <Time>{time}</Time> : null}
                <Logos>
                  {appsOf(item.accounts).map(app => (
                    <Logo key={app} source={FRIEND_APP_ICON[app]} accessible={false} />
                  ))}
                </Logos>
              </Side>
            </Row>
          );
        })}
      </List>
    </BottomSheet>
  );
};

const List = styled.View`
  margin-top: 12px;
`;

// 줄 높이 약 76 (시안 두 줄 간격 152px)
const Row = styled.Pressable`
  min-height: 76px;
  flex-direction: row;
  align-items: center;
  padding: 0px 2px 0px 12px;
`;

const CheckSlot = styled.View`
  margin-right: 12px;
`;

const Texts = styled.View`
  flex: 1;
  margin-left: 12px;
  margin-right: 8px;
  gap: 4px;
`;

// TODO(Figma 스타일 확인): 이름 약 14 SemiBold → titleSection 14/20, 주제 약 11 → captionSmall 11/16
const Name = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Topic = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Side = styled.View`
  align-items: flex-end;
  gap: 6px;
`;

const Time = styled.Text`
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Logos = styled.View`
  flex-direction: row;
  gap: 2px;
`;

const Logo = styled.Image`
  width: 15px;
  height: 15px;
`;

const Empty = styled.Text`
  padding: 24px 0px;
  text-align: center;
  ${({ theme }) => theme.fonts.bodySmallMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default ConnectFriendSheet;
