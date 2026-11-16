import styled from "styled-components/native";

// 인증·온보딩 화면 상단 제목 + 설명 (Figma: Intro)
// - auth      : 왼쪽 정렬, 제목 Display/Auth(24/35)
// - onboarding: 가운데 정렬, 제목 Heading/Onboarding(22/31) (Figma 02 ~ 12)
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
    <Wrapper $variant={variant}>
      <Title accessibilityRole="header" $variant={variant}>
        {title}
      </Title>
      {description && (
        <Description $variant={variant}>{description}</Description>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.View<{ $variant: AuthIntroVariant }>`
  gap: ${({ $variant }) => ($variant === "onboarding" ? 12 : 6)}px;
`;

const Title = styled.Text<{ $variant: AuthIntroVariant }>`
  ${({ theme, $variant }) =>
    $variant === "onboarding"
      ? theme.fonts.headingOnboarding
      : theme.fonts.displayAuth};
  text-align: ${({ $variant }) =>
    $variant === "onboarding" ? "center" : "left"};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text<{ $variant: AuthIntroVariant }>`
  ${({ theme }) => theme.fonts.bodyMedium};
  text-align: ${({ $variant }) =>
    $variant === "onboarding" ? "center" : "left"};
  color: ${({ theme }) => theme.colors.textSecondary};
`;
