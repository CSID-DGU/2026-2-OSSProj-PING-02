import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { useAuthNavigation } from "@hooks/useAuthNavigation";

// 아이디 찾기 | 비밀번호 찾기 (01-1 계정 시작, 01-2 로그인 공통)
export default function FindLinks() {
  const navigation = useAuthNavigation();

  return (
    <Wrapper>
      <Button variant="text" onPress={() => navigation.navigate("FindId")}>
        아이디 찾기
      </Button>
      <Divider>|</Divider>
      <Button
        variant="text"
        onPress={() => navigation.navigate("FindPassword")}
      >
        비밀번호 찾기
      </Button>
    </Wrapper>
  );
}

const Wrapper = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 4px;
`;

const Divider = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;
