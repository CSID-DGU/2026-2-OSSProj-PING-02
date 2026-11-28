import styled from "styled-components/native";

export const Fields = styled.View`
  gap: 14px;
`;

// 생년월일·성별·이메일 입력은 components/auth/ProfileInputs (#60, 설정 H02와 같이 씀)

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

// 아이디 입력란 + 바로 옆 "중복 확인" 버튼
export const IdRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const IdInput = styled.View`
  flex: 1;
`;

export const SubmitHint = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
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
