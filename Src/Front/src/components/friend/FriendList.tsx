import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Input } from "@core/ui/field";
import { SearchIcon } from "@core/ui/icon";
import { UnderlineTabs } from "@core/ui/tabs";
import Notice from "@components/onboarding/Notice";
import FriendRow from "@components/friend/FriendRow";
import {
  FRIEND_TABS,
  inFriendTab,
  matchesFriendQuery,
  type FriendTab,
} from "@constants/friend";
import { useFocusLoad } from "@hooks/useFocusLoad";
import { services, type FriendSummary } from "@services";
import newEmptyImage from "@assets/img/friend/malssi-new-empty.png";

// 06 친구 목록 내용 (앱바 아래 전부): 검색창 · 6개 탭 · 줄 · 빈 상태
// E01 친구 탭 첫 화면과 E05 첫마디 보내기(친구 고르기)가 같이 씀. 줄을 누르면 onSelect
// 검색창(높이 41, 양옆 20) → 탭(양옆 16) → 12 → 줄 (Figma "06 친구 최종", 720px ÷2)
// - 연락 최신순 (디자이너 댓글), NEW도 함께 보여 줌
// - 검색: 지금 탭 안에서 친구 이름·앱 계정 이름으로 찾음
// 시안에 없는 상태(예전 화면 그대로): 불러오는 중 · 오류 · 친구가 아직 없음 · 검색 결과 없음
// 글자 (디자이너 확인): 검색창 captionSearch 12/22 · 빈 상태 문구 bodySmallMedium 13/20
interface FriendListProps {
  onSelect: (item: FriendSummary) => void;
  // NEW 빈 상태 버튼 2개
  onReply: () => void;
  onReachOut: () => void;
  // 탭을 밖에서 정할 때 (상세 화면 탭 → 목록). 없으면 "전체"부터
  tab?: FriendTab;
  onTabChange?: (tab: FriendTab) => void;
}

const FriendList = ({
  onSelect,
  onReply,
  onReachOut,
  tab: tabProp,
  onTabChange,
}: FriendListProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [ownTab, setOwnTab] = useState<FriendTab>("all");
  const tab = tabProp ?? ownTab;
  const setTab = (next: FriendTab) => {
    setOwnTab(next);
    onTabChange?.(next);
  };
  const load = useCallback(() => services.friends.list(), []);
  const { state, retry, reload } = useFocusLoad(load);

  if (state.status === "loading") {
    return (
      <Center>
        <ActivityIndicator
          color={theme.colors.iconSubtle}
          accessibilityLabel="친구 목록을 불러오는 중"
        />
      </Center>
    );
  }

  if (state.status === "error") {
    return (
      <Center>
        <Notice tone="danger" align="center" title="친구 목록을 불러오지 못했어요">
          <Button variant="text" onPress={retry}>
            다시 불러오기
          </Button>
        </Notice>
      </Center>
    );
  }

  const friends = state.data;
  const data = friends.filter(
    f => inFriendTab(f, tab) && matchesFriendQuery(f, query)
  );
  const searching = query.trim().length > 0;

  const toggleFavorite = async (personId: string, favorite: boolean) => {
    try {
      await services.friends.setFavorite(personId, favorite);
    } finally {
      await reload();
    }
  };

  const empty = (() => {
    if (friends.length === 0) {
      return (
        <EmptyNotice>
          <Notice align="center" title="아직 친구가 없어요">
            메신저에서 연락이 오면 같은 사람의 계정끼리 모아 여기에 보여 드릴게요.
          </Notice>
        </EmptyNotice>
      );
    }
    if (searching) {
      return (
        <EmptyNotice>
          <Notice align="center" title={`‘${query.trim()}’ 친구를 찾지 못했어요`}>
            다른 이름이나 메신저에서 쓰는 이름으로 찾아봐도 괜찮아요.
          </Notice>
        </EmptyNotice>
      );
    }
    if (tab === "new") {
      return (
        <NewEmpty>
          <NewEmptyText>
            {"새롭게 발견된 친구가 없어요.\n기존 친구들에게 답장을 해보거나,\n먼저 연락을 해볼까요?"}
          </NewEmptyText>
          <NewEmptyImage source={newEmptyImage} accessible={false} />
          <NewEmptyActions>
            <Button variant="primary" fullWidth onPress={onReply}>
              답장하러 가기
            </Button>
            <Button variant="primary" fullWidth onPress={onReachOut}>
              연락하러 가기
            </Button>
          </NewEmptyActions>
        </NewEmpty>
      );
    }
    // TODO(디자이너 공유): 친구·가족·직장·기타 탭이 비었을 때 시안 없음
    //   → 팀 확인 문구 한 줄, 자리·글자는 NEW 빈 상태 문구와 같게
    return (
      <NewEmpty>
        <NewEmptyText>아직 이 관계의 친구가 없어요</NewEmptyText>
      </NewEmpty>
    );
  })();

  return (
    <>
      <Top>
        {friends.length > 0 && (
          <Search>
            <SearchInput
              size="small"
              value={query}
              onChangeText={setQuery}
              placeholder="검색하기"
              accessibilityLabel="친구 이름 검색"
              returnKeyType="search"
            />
            <SearchIconBox pointerEvents="none">
              <SearchIcon />
            </SearchIconBox>
          </Search>
        )}
        <Tabs>
          <UnderlineTabs tabs={FRIEND_TABS} value={tab} onChange={setTab} />
        </Tabs>
      </Top>
      <FlatList
        data={data}
        keyExtractor={item => item.person.id}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listContent}
        renderItem={({ item }) => (
          <FriendRow
            item={item}
            onPress={() => onSelect(item)}
            onToggleFavorite={() =>
              toggleFavorite(item.person.id, !item.person.favorite)
            }
          />
        )}
      />
    </>
  );
};

const listContent = { paddingTop: 12, paddingBottom: 12 };

const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

// 앱바 아래 18
const Top = styled.View`
  padding-top: 18px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Search = styled.View`
  margin: 0px 20px;
  justify-content: center;
`;

// 시안: 높이 41 · 왼쪽 글자까지 17 · 오른쪽 돋보기
const SearchInput = styled(Input)`
  height: 41px;
  padding-left: 16px;
  padding-right: 44px;
  border-radius: 10px;
  ${({ theme }) => theme.fonts.captionSearch};
`;

// 돋보기 16, 상자 오른쪽 안에서 약 19
const SearchIconBox = styled.View`
  position: absolute;
  right: 19px;
`;

const Tabs = styled.View`
  padding: 0px 16px;
`;

const EmptyNotice = styled.View`
  padding: 24px 20px;
`;

// 시안 E01-4: 탭 아래 약 42 → 문구 3줄(줄 20) → 41 → 캐릭터 → 26 → 버튼 2개(사이 4, 양옆 26)
const NewEmpty = styled.View`
  padding: 30px 26px 0px;
  align-items: center;
`;

const NewEmptyText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmallMedium};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

// malssi-new-empty@2x.png 240×220 → 120×110
const NewEmptyImage = styled.Image`
  width: 120px;
  height: 110px;
  margin-top: 41px;
`;

const NewEmptyActions = styled.View`
  align-self: stretch;
  gap: 4px;
  margin-top: 26px;
`;

export default FriendList;
