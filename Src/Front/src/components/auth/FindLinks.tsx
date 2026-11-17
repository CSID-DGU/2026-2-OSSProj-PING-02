import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { FIND_ACCOUNT_UNAVAILABLE } from "@constants/auth";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { AUTH_FEATURES } from "@services";

// 아이디 찾기 | 비밀번호 찾기 (01-1 계정 시작, 01-2 로그인 공통)
// 이메일 기능이 꺼져 있으면(백엔드 #25: 이메일 없음) 찾을 방법이 없어 안내 문구로 대신함
export default function FindLinks() {
  const navigation = useAuthNavigation();

  if (!AUTH_FEATURES.emailEnabled) {
    return <Unavailable>{FIND_ACCOUNT_UNAVAILABLE}</Unavailable>;
  }

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

const Unavailable = styled.Text`
  ${({ theme }) => theme.fonts.captionSmall};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
