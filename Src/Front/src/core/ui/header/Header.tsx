import styled from "styled-components/native";
import { BackIcon } from "../icon";

// Figma: Navigation / Auth Header
export interface HeaderProps {
  title: string;
  onBack?: () => void;
}

const Wrapper = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0px 20px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

// 아이콘은 24px이지만 터치 영역은 hitSlop으로 44px 확보
const BackButton = styled.TouchableOpacity`
  width: 24px;
  height: 24px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.titleAppBar};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Header = ({ title, onBack }: HeaderProps) => {
  return (
    <Wrapper>
      {onBack && (
        <BackButton
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={10}
        >
          <BackIcon />
        </BackButton>
      )}
      <Title>{title}</Title>
    </Wrapper>
  );
};

export default Header;
