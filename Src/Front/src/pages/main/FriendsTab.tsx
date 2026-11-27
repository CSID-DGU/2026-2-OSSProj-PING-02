import { useEffect, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import TabScreen from "@components/main/TabScreen";
import FriendList from "@components/friend/FriendList";
import type { FriendTab } from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import type { AppParamList } from "@routes/types";

// 06 친구 E01 목록 (Figma "06 친구 최종", 720px ÷2)
// 앱바(가운데 제목, 🔔, 구분선 없음) → 목록 내용(FriendList)
// - 탭 첫 화면이라 뒤로가기 화살표 없음 (05 연락과 통일, 시안에는 있음)
// - 상세 화면에서 6개 탭을 누르면 그 탭, 검색창을 누르면 검색칸 포커스로 돌아옴 (route params)
const FriendsTab = ({ title }: { title: string }) => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "FriendsMain">>();
  const [tab, setTab] = useState<FriendTab>(params?.tab ?? "all");

  // 같은 탭을 다시 골라도 반영되게 params가 새로 올 때마다
  useEffect(() => {
    if (params?.tab) setTab(params.tab);
  }, [params]);

  return (
    <TabScreen title={title} divider={false} background="surface">
      <FriendList
        tab={tab}
        onTabChange={setTab}
        focusSearchKey={params?.focusSearch}
        onSelect={item =>
          navigation.navigate("FriendDetail", { personId: item.person.id })
        }
        onReply={() => navigation.navigate("Home", { screen: "contacts" })}
        onReachOut={() => navigation.navigate("FirstWordsPick")}
      />
    </TabScreen>
  );
};

export default FriendsTab;
