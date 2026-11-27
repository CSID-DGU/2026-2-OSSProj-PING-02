import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Input } from "@core/ui/field";
import { UnderlineTabs } from "@core/ui/tabs";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import FriendRow from "@components/friend/FriendRow";
import { SearchIcon } from "@components/friend/TempIcons";
import {
  FRIEND_TABS,
  inFriendTab,
  matchesFriendQuery,
  type FriendTab,
} from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useFocusLoad } from "@hooks/useFocusLoad";
import { services } from "@services";
import newEmptyImage from "@assets/img/friend/malssi-new-empty.png";

// 06 친구 E01 목록 (Figma "06 친구 최종", 720px ÷2)
// 앱바(가운데 제목, 🔔, 구분선 없음) → 18 → 검색창(높이 41, 양옆 20) → 탭(양옆 16) → 12 → 줄
// - 연락 최신순 (디자이너 댓글), NEW도 함께 보여 줌
// - 검색: 지금 탭 안에서 친구 이름·앱 계정 이름으로 찾음
// - 탭 첫 화면이라 뒤로가기 화살표 없음 (05 연락과 통일, 시안에는 있음)
// 시안에 없는 상태(예전 화면 그대로): 불러오는 중 · 오류 · 친구가 아직 없음 · 검색 결과 없음
// TODO(Figma 글자 스타일): 검색창 글자 captionRegular (가까운 토큰)
const FriendsTab = ({ title }: { title: string }) => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FriendTab>("all");
  const load = useCallback(() => services.friends.list(), []);
  const { state, retry, reload } = useFocusLoad(load);

  if (state.status === "loading") {
    return (
      <TabScreen title={title} divider={false}>
        <Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="친구 목록을 불러오는 중"
          />
        </Center>
      </TabScreen>
    );
  }

  if (state.status === "error") {
    return (
      <TabScreen title={title} divider={false}>
        <Center>
          <Notice tone="danger" align="center" title="친구 목록을 불러오지 못했어요">
            <Button variant="text" onPress={retry}>
              다시 불러오기
            </Button>
          </Notice>
        </Center>
      </TabScreen>
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
          {/* TODO(에셋): 시안 PNG 한 장(172×158)을 임시로 씀. 2x·3x를 받으면 교체 */}
          <NewEmptyImage source={newEmptyImage} accessible={false} />
          <NewEmptyActions>
            <Button
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate("Home", { screen: "contacts" })}
            >
              답장하러 가기
            </Button>
            <Button
              variant="primary"
              fullWidth
              onPress={() => navigation.navigate("Home", { screen: "home" })}
            >
              연락하러 가기
            </Button>
          </NewEmptyActions>
        </NewEmpty>
      );
    }
    // TODO(디자이너 공유): 친구·가족·직장·기타 탭이 비었을 때 시안 없음 → 지금은 비워 둠
    return undefined;
  })();

  return (
    <TabScreen title={title} divider={false}>
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
            onPress={() =>
              navigation.navigate("FriendDetail", { personId: item.person.id })
            }
            onToggleFavorite={() =>
              toggleFavorite(item.person.id, !item.person.favorite)
            }
          />
        )}
      />
    </TabScreen>
  );
};

const listContent = { paddingTop: 12, paddingBottom: 12 };

const Center = styled.View`
  flex: 1;
  justify-content: center;
  padding: 24px 20px;
`;

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
  ${({ theme }) => theme.fonts.captionRegular};
`;

const SearchIconBox = styled.View`
  position: absolute;
  right: 16px;
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
  ${({ theme }) => theme.fonts.bodySmallRelaxed};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const NewEmptyImage = styled.Image`
  width: 112px;
  height: 103px;
  margin-top: 41px;
`;

const NewEmptyActions = styled.View`
  align-self: stretch;
  gap: 4px;
  margin-top: 26px;
`;

export default FriendsTab;
