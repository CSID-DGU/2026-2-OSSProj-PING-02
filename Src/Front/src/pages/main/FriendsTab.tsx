import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { Card, CardDescription } from "@core/ui/card";
import { Input } from "@core/ui/field";
import AuthIntro from "@components/auth/AuthIntro";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { friendStatusText } from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useFocusLoad } from "@hooks/useFocusLoad";
import { services, type FriendSummary } from "@services";
import * as s from "./FriendsTab_styled";

// 05 / 13 친구 목록 (Figma 05 친구 Screens, 색·컴포넌트는 design-system)
// - 최근에 연락한 순서, 얼려둔 관계는 맨 아래 (서비스에서 정렬)
// - 이름 검색: 친구 이름과 앱별 계정 이름에서 찾음
// TODO(디자인): 시안 앱바 "Label"·햄버거·프로필은 04와 같이 화면 이름만 둠 (TabScreen)
const matches = (item: FriendSummary, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.person.displayName, ...item.accounts.map(a => a.senderName)].some(
    name => name.toLowerCase().includes(q)
  );
};

const FriendsTab = ({ title }: { title: string }) => {
  const theme = useTheme();
  const navigation = useAuthNavigation();
  const [query, setQuery] = useState("");
  const load = useCallback(() => services.friends.list(), []);
  const { state, retry } = useFocusLoad(load);

  if (state.status === "loading") {
    return (
      <TabScreen title={title}>
        <s.Center>
          <ActivityIndicator
            color={theme.colors.iconSubtle}
            accessibilityLabel="친구 목록을 불러오는 중"
          />
        </s.Center>
      </TabScreen>
    );
  }

  if (state.status === "error") {
    return (
      <TabScreen title={title}>
        <s.Center>
          <Notice tone="danger" align="center" title="친구 목록을 불러오지 못했어요">
            <Button variant="text" onPress={retry}>
              다시 불러오기
            </Button>
          </Notice>
        </s.Center>
      </TabScreen>
    );
  }

  const friends = state.data;
  const data = friends.filter(f => matches(f, query));

  const header = (
    <s.Header>
      <AuthIntro
        title="친구"
        description="다시 연락하고 싶은 관계를 천천히 살펴봐요."
      />
      {friends.length > 0 && (
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="친구 이름 검색"
          accessibilityLabel="친구 이름 검색"
          returnKeyType="search"
        />
      )}
    </s.Header>
  );

  const empty =
    friends.length === 0 ? (
      <Notice align="center" title="아직 친구가 없어요">
        메신저에서 연락이 오면 같은 사람의 계정끼리 모아 여기에 보여 드릴게요.
      </Notice>
    ) : (
      <Notice align="center" title={`‘${query.trim()}’ 친구를 찾지 못했어요`}>
        다른 이름이나 메신저에서 쓰는 이름으로 찾아봐도 괜찮아요.
      </Notice>
    );

  return (
    <TabScreen title={title}>
      <FlatList
        data={data}
        keyExtractor={item => item.person.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => {
          const status = friendStatusText(item.person.frozen, item.lastContactAt);
          return (
            <Card
              onPress={() =>
                navigation.navigate("FriendDetail", { personId: item.person.id })
              }
              accessibilityLabel={`${item.person.displayName}, ${status}`}
              accessibilityHint="눌러서 친구 정보를 봐요"
            >
              {/* 긴 이름은 한 줄로 말줄임 */}
              <s.Title numberOfLines={1}>{item.person.displayName}</s.Title>
              <CardDescription numberOfLines={1}>{status}</CardDescription>
            </Card>
          );
        }}
      />
    </TabScreen>
  );
};

export default FriendsTab;
