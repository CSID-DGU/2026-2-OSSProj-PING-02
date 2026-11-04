import styled from "styled-components/native";
import { Button } from "@core/ui/button";

// "아직 계정이 없나요? 회원가입"처럼 안내 문구 + 텍스트 버튼 한 줄
interface AuthPromptProps {
  message: string;
  actionLabel: string;
  onPress: () => void;
}

export default function AuthPrompt({
  message,
  actionLabel,
  onPress,
}: AuthPromptProps) {
  return (
    <Wrapper>
      <Message>{message}</Message>
      <Button variant="text" onPress={onPress}>
        {actionLabel}
      </Button>
    </Wrapper>
  );
}

const Wrapper = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 2px;
`;

const Message = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;
