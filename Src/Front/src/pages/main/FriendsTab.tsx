import TabScreen from "@components/main/TabScreen";
import FriendList from "@components/friend/FriendList";
import { useAuthNavigation } from "@hooks/useAuthNavigation";

// 06 친구 E01 목록 (Figma "06 친구 최종", 720px ÷2)
// 앱바(가운데 제목, 🔔, 구분선 없음) → 목록 내용(FriendList)
// - 탭 첫 화면이라 뒤로가기 화살표 없음 (05 연락과 통일, 시안에는 있음)
const FriendsTab = ({ title }: { title: string }) => {
  const navigation = useAuthNavigation();
  return (
    <TabScreen title={title} divider={false}>
      <FriendList
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
