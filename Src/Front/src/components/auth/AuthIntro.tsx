import styled from "styled-components/native";

// 인증 화면 상단 제목 + 한 줄 설명 (Figma: Intro)
interface AuthIntroProps {
  title: string;
  description: string;
}

export default function AuthIntro({ title, description }: AuthIntroProps) {
  return (
    <Wrapper>
      <Title accessibilityRole="header">{title}</Title>
      <Description>{description}</Description>
    </Wrapper>
  );
}

const Wrapper = styled.View`
  gap: 6px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.displayAuth};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
