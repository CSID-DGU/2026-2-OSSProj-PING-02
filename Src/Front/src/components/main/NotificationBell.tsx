import { useNavigation, useRoute } from "@react-navigation/native";
import styled from "styled-components/native";
import { BellIcon } from "@core/ui/icon";

// 앱바 오른쪽 🔔 (Figma 05 연락·06 친구 Screens 11.22): 누르면 알림 센터(지금은 자리만)
// 알림 센터 화면 자신에서는 숨김
// TODO(네이티브·API): 안 읽은 알림이 있으면 dot 표시 (시안의 작은 점)
const NotificationBell = () => {
  const navigation = useNavigation();
  const route = useRoute();
  if (route.name === "Notifications") return null;

  return (
    <Press
      onPress={() => navigation.navigate("Notifications")}
      accessibilityRole="button"
      accessibilityLabel="알림"
      hitSlop={12}
    >
      <BellIcon />
    </Press>
  );
};

// 아이콘 24dp, 터치 영역은 hitSlop으로 48dp
const Press = styled.TouchableOpacity`
  width: 24px;
  height: 24px;
`;

export default NotificationBell;
