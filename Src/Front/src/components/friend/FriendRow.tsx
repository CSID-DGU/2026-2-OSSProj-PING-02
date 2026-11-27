import styled from "styled-components/native";
import { HeartIcon, SproutIcon, StarIcon } from "@core/ui/icon";
import { APP_LABEL } from "@constants/contact";
import {
  favoriteShape,
  FRIEND_APP_ICON,
  formatFriendTime,
  isNewFriend,
  RELATION_LABEL,
} from "@constants/friend";
import { appsOf, type FriendSummary } from "@services";
import FriendAvatar from "./FriendAvatar";

// 06 친구 E01 목록 한 줄 (720px 시안 ÷2)
// 줄 높이 72 · 왼쪽 28 · 아바타 44 → 12 → 이름(NEW는 새싹 + 이름) / 관계 칩 → 16 → 메신저 로고(15, 사이 2)
// 오른쪽 30 안쪽: 위 별·하트(NEW는 없음), 아래 시간 (칩 줄과 같은 높이)
// 별·하트는 줄 누르기와 따로 누를 수 있게 줄 위에 겹쳐 둠 (스크린리더에서도 따로 읽힘)
// TODO(Figma 글자 스타일): 이름 titleSection · 칩 captionSmall · 시간 captionHero (05 연락 줄 기준 가까운 토큰)
interface FriendRowProps {
  item: FriendSummary;
  onPress: () => void;
  onToggleFavorite: () => void;
}

const FriendRow = ({ item, onPress, onToggleFavorite }: FriendRowProps) => {
  const { person, accounts, lastContactAt, attention } = item;
  const isNew = isNewFriend(item);
  const apps = appsOf(accounts);
  const chip = isNew ? "NEW" : person.relation ? RELATION_LABEL[person.relation] : null;
  const time = lastContactAt ? formatFriendTime(lastContactAt) : null;
  const shape = favoriteShape(person.relation);
  const favorite = !!person.favorite;

  const label = [
    person.displayName,
    chip,
    apps.map(app => APP_LABEL[app]).join(", "),
    time,
    attention ? "확인할 연락 있음" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Wrapper>
      <Main
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="눌러서 친구 정보를 봐요"
      >
        <FriendAvatar dot={attention} />
        <Texts>
          <NameLine>
            {isNew && <SproutIcon />}
            <Name numberOfLines={1}>{person.displayName}</Name>
          </NameLine>
          <MetaLine>
            {chip && (
              <Chip>
                <ChipText>{chip}</ChipText>
              </Chip>
            )}
            <Logos $gap={!!chip}>
              {apps.map(app => (
                <Logo key={app} source={FRIEND_APP_ICON[app]} accessible={false} />
              ))}
            </Logos>
          </MetaLine>
        </Texts>
        <Side>
          {/* 별·하트 자리 (실제 버튼은 아래에서 겹쳐 그림) */}
          <IconSpace />
          {time && <Time numberOfLines={1}>{time}</Time>}
        </Side>
      </Main>

      {!isNew && (
        <Favorite
          onPress={onToggleFavorite}
          hitSlop={16}
          accessibilityRole="checkbox"
          accessibilityLabel={`${person.displayName} 중요한 친구로 표시`}
          accessibilityState={{ checked: favorite }}
        >
          {shape === "star" ? (
            <StarIcon active={favorite} />
          ) : (
            <HeartIcon active={favorite} />
          )}
        </Favorite>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.View``;

const Main = styled.Pressable`
  height: 72px;
  flex-direction: row;
  align-items: center;
  padding: 0px 30px 0px 28px;
`;

const Texts = styled.View`
  flex: 1;
  margin-left: 12px;
  margin-right: 8px;
  gap: 2px;
`;

const NameLine = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  height: 20px;
`;

const Name = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const MetaLine = styled.View`
  flex-direction: row;
  align-items: center;
  height: 19px;
`;

// 관계 칩: 높이 19 · 양옆 10 · 바탕 brandSeed (시안 #F7D876)
const Chip = styled.View`
  height: 19px;
  padding: 0px 10px;
  border-radius: 10px;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const ChipText = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Logos = styled.View<{ $gap: boolean }>`
  flex-direction: row;
  gap: 2px;
  margin-left: ${({ $gap }) => ($gap ? 16 : 0)}px;
`;

const Logo = styled.Image`
  width: 15px;
  height: 15px;
`;

const Side = styled.View`
  align-items: flex-end;
  gap: 2px;
`;

const IconSpace = styled.View`
  height: 20px;
`;

const Time = styled.Text`
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 시안: 아이콘 위 16(줄 위에서) · 오른쪽 30 (별 18×17, 하트 15×14)
const Favorite = styled.Pressable`
  position: absolute;
  top: 16px;
  right: 30px;
`;

export default FriendRow;
