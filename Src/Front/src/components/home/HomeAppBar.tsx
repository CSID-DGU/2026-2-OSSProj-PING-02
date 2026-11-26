import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import { Header } from "@core/ui/header";
import { BackIcon } from "@core/ui/icon";
import NotificationBell from "@components/main/NotificationBell";

// 04 홈 C02~C05 앱바 (Figma Appbar_back: "<  오늘의 도움 수준  🔔")
// core Header(가운데 정렬)는 그대로 쓰고, 시안 위치에 맞게 양쪽 아이콘만 옮김
// - 뒤로 화살표: 아이콘 상자 왼쪽이 21.5dp (Header 기본 16dp → 5.5dp 오른쪽)
// - 🔔: 아이콘 상자 오른쪽이 321.5dp (Header 기본 344dp → 22dp 왼쪽)
interface HomeAppBarProps {
  title: string;
  onBack?: () => void;
}

const HomeAppBar = ({ title, onBack }: HomeAppBarProps) => {
  const navigation = useNavigation();
  return (
    <Header
      title={title}
      titleAlign="center"
      left={
        <BackPress
          onPress={onBack ?? navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={12}
        >
          <BackIcon />
        </BackPress>
      }
      right={
        <BellSlot>
          <NotificationBell />
        </BellSlot>
      }
    />
  );
};

// Header의 왼쪽 칸(48dp, 가운데 정렬) 안에서 margin으로 위치를 옮김
const BackPress = styled.TouchableOpacity`
  width: 24px;
  height: 24px;
  margin-left: 11px;
`;

const BellSlot = styled.View`
  margin-right: 44px;
`;

export default HomeAppBar;
