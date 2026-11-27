import { useState } from "react";
import TabScreen from "@components/main/TabScreen";
import FriendList from "@components/friend/FriendList";
import type { FriendTab } from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";

// 06 친구 E05 첫마디 보내기: 먼저 연락할 친구 고르기 (Figma "E05 재연결 제안", 720px ÷2)
// 앱바(뒤로가기 · 가운데 제목 · 🔔, 구분선 없음) → E01과 같은 목록(FriendList)
// 친구를 누르면 그 친구의 첫마디 제안(FirstWords)으로
// 들어오는 곳: 홈 "오랜만에 안부 전하기" 카드 · 도움 수준 화면 안부 줄 · NEW 빈 상태 "연락하러 가기"
// NEW 빈 상태의 "연락하러 가기"는 이미 이 화면이라 전체 탭으로 바꿈
const FirstWordsPick = () => {
  const navigation = useAuthNavigation();
  const [tab, setTab] = useState<FriendTab>("all");
  return (
    <TabScreen
      title="첫마디 보내기"
      divider={false}
      background="surface"
      onBack={() => navigation.goBack()}
    >
      <FriendList
        tab={tab}
        onTabChange={setTab}
        onSelect={item =>
          navigation.navigate("FirstWords", { personId: item.person.id })
        }
        onReply={() => navigation.navigate("Home", { screen: "contacts" })}
        onReachOut={() => setTab("all")}
      />
    </TabScreen>
  );
};

export default FirstWordsPick;
