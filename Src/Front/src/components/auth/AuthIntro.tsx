import styled from "styled-components/native";

// 인증·온보딩 화면 상단 제목 + 한 줄 설명 (Figma: Intro)
// variant="onboarding"이면 제목에 Heading/Onboarding(22/31), 기본은 Display/Auth(24/35)
export type AuthIntroVariant = "auth" | "onboarding";

interface AuthIntroProps {
  title: string;
  description?: string;
  variant?: AuthIntroVariant;
}

export default function AuthIntro({
  title,
  description,
  variant = "auth",
}: AuthIntroProps) {
  return (
    <Wrapper>
      <Title accessibilityRole="header" $variant={variant}>
        {title}
      </Title>
      {description && <Description>{description}</Description>}
    </Wrapper>
  );
}

const Wrapper = styled.View`
  gap: 6px;
`;

const Title = styled.Text<{ $variant: AuthIntroVariant }>`
  ${({ theme, $variant }) =>
    $variant === "onboarding"
      ? theme.fonts.headingOnboarding
      : theme.fonts.displayAuth};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
