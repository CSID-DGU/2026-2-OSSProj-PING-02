import styled from "styled-components/native";

export const Fields = styled.View`
  gap: 14px;
`;

// 생년월일·이메일 한 줄 (Figma 너비 비율 그대로 flex로 나눔)
export const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const EmailLocal = styled.View`
  flex: 132;
`;

export const EmailDomain = styled.View`
  flex: 148;
`;

export const At = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Terms = styled.View`
  gap: 10px;
`;

export const AgreeAllBox = styled.View<{ $error: boolean }>`
  padding: 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme, $error }) =>
      $error ? theme.colors.stateError : theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

export const TermRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

// 약관 제목이 길거나 글자를 키워도 "보기" 버튼을 밀어내지 않고 줄바꿈
export const TermCheck = styled.View`
  flex: 1;
`;

export const TermsNote = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export const TermsStatus = styled.View`
  height: 48px;
  justify-content: center;
  align-items: center;
`;

export const Actions = styled.View`
  gap: 10px;
`;
