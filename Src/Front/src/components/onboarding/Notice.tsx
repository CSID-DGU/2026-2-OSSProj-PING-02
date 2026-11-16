import type { ReactNode } from "react";
import styled from "styled-components/native";

// 안내·오류·완료 상자 (feedback 토큰). 색만으로 구분하지 않도록 제목을 함께 씀
export type NoticeTone = "info" | "danger" | "success";

interface NoticeProps {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode; // 설명 문장 또는 버튼
}

const Notice = ({ tone = "info", title, children }: NoticeProps) => (
  <Box $tone={tone} accessibilityLiveRegion="polite">
    <Title $tone={tone}>{title}</Title>
    {typeof children === "string" ? (
      <Description>{children}</Description>
    ) : (
      children
    )}
  </Box>
);

const Box = styled.View<{ $tone: NoticeTone }>`
  gap: 4px;
  padding: 14px 16px;
  border-radius: 12px;
  background-color: ${({ theme, $tone }) =>
    ({
      info: theme.colors.feedbackInfoBg,
      danger: theme.colors.feedbackDangerBg,
      success: theme.colors.feedbackSuccessBg,
    }[$tone])};
`;

const Title = styled.Text<{ $tone: NoticeTone }>`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme, $tone }) =>
    ({
      info: theme.colors.feedbackInfoText,
      danger: theme.colors.feedbackDangerText,
      success: theme.colors.feedbackSuccessText,
    }[$tone])};
`;

export const NoticeDescription = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Description = NoticeDescription;

export default Notice;
