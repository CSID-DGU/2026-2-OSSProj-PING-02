import styled from "styled-components/native";

// 04 연락 상세·답장 화면(08 ~ 11) 공통 (Figma 와이어프레임: 양옆 20, 카드 사이 12)

export const Center = styled.View`
  flex: 1;
  justify-content: center;
  gap: 12px;
  padding: 24px 0px;
`;

export const Cards = styled.View`
  gap: 12px;
`;

export const Actions = styled.View`
  gap: 12px;
  padding-top: 4px;
`;

// 카드 안 글자 (공통 CardTitle·CardDescription과 같은 토큰, 줄 수만 다르게)
export const BlockTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const BlockBody = styled.Text`
  margin-top: 4px;
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Muted = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export const Hint = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
`;

// 14 연결된 계정 한 줄: 앱 · 이름(말줄임) + 오른쪽 텍스트 버튼
export const AccountRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
`;

export const AccountName = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 단톡 메시지 한 줄 (09-C)
export const MessageRow = styled.View`
  gap: 2px;
`;

export const Sender = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const MessageText = styled.Text<{ $strong?: boolean }>`
  ${({ theme, $strong }) =>
    $strong ? theme.fonts.titleSection : theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// "나를 언급" 표시: 색 + 글자로 함께 구분
export const MentionBadge = styled.View`
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.stateSelectedBg};
`;

export const MentionText = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.stateSelectedContent};
`;
