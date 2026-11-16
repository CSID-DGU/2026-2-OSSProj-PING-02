import type { ReactNode } from "react";
import styled, { css } from "styled-components/native";

// 안내·오류·완료 상자. 색만으로 구분하지 않도록 제목을 함께 씀
// - align="left"  (Figma 06·11 파란 상자): 테두리 없음, 제목·본문 모두 톤 색
// - align="center"(Figma 07·08·12 상자): 테두리 + 가운데 정렬, 제목은 기본 글자색
export type NoticeTone = "info" | "danger" | "success" | "seed";
export type NoticeAlign = "left" | "center";

interface NoticeProps {
  tone?: NoticeTone;
  align?: NoticeAlign;
  bordered?: boolean;
  title: string;
  children?: ReactNode; // 설명 문장 또는 버튼
}

const Notice = ({
  tone = "info",
  align = "left",
  bordered = align === "center",
  title,
  children,
}: NoticeProps) => (
  <Box
    $tone={tone}
    $align={align}
    $bordered={bordered}
    accessibilityLiveRegion="polite"
  >
    <Title $tone={tone} $align={align}>
      {title}
    </Title>
    {typeof children === "string" ? (
      <Description $tone={tone} $align={align}>
        {children}
      </Description>
    ) : (
      children
    )}
  </Box>
);

const Box = styled.View<{
  $tone: NoticeTone;
  $align: NoticeAlign;
  $bordered: boolean;
}>`
  gap: ${({ $align }) => ($align === "center" ? 12 : 8)}px;
  padding: ${({ $align }) => ($align === "center" ? "16px 20px" : "14px 14px")};
  border-radius: ${({ $align }) => ($align === "center" ? 12 : 10)}px;
  align-items: ${({ $align }) => ($align === "center" ? "center" : "stretch")};
  background-color: ${({ theme, $tone }) =>
    ({
      info: theme.colors.feedbackInfoBg,
      danger: theme.colors.feedbackDangerBg,
      success: theme.colors.feedbackSuccessBg,
      seed: theme.colors.surfaceSeed,
    }[$tone])};
  ${({ theme, $bordered }) =>
    $bordered &&
    css`
      border: 1px solid ${theme.colors.borderDefault};
    `}
`;

const toneText = (
  theme: import("styled-components/native").DefaultTheme,
  tone: NoticeTone
) =>
  ({
    info: theme.colors.feedbackInfoText,
    danger: theme.colors.feedbackDangerText,
    success: theme.colors.feedbackSuccessText,
    seed: theme.colors.textBrand,
  }[tone]);

const Title = styled.Text<{ $tone: NoticeTone; $align: NoticeAlign }>`
  ${({ theme }) => theme.fonts.titleSection};
  text-align: ${({ $align }) => $align};
  color: ${({ theme, $tone, $align }) =>
    // 오류는 가운데 상자에서도 색으로 한 번 더 구분
    $align === "center" && $tone !== "danger"
      ? theme.colors.textPrimary
      : toneText(theme, $tone)};
`;

const Description = styled.Text<{ $tone: NoticeTone; $align: NoticeAlign }>`
  ${({ theme }) => theme.fonts.bodySmall};
  text-align: ${({ $align }) => $align};
  color: ${({ theme, $tone, $align }) =>
    $align === "center" ? theme.colors.textSecondary : toneText(theme, $tone)};
`;

// children으로 직접 문장을 넣을 때 쓰는 본문 (가운데 상자 기준 색)
export const NoticeDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

export default Notice;
