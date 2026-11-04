import styled from "styled-components/native";
import seed from "@assets/img/auth/seed.png";

// 스플래시·계정 시작 화면 공통 로고 영역
export default function BrandLogo() {
  return (
    <Wrapper>
      <Logo source={seed} />
      <Title>말씨앗</Title>
      <Description>다시 말을 건넬 힘이 생길 때까지</Description>
    </Wrapper>
  );
}

const Wrapper = styled.View`
  width: 100%;
  align-items: center;
`;

const Logo = styled.Image`
  width: 110px;
  height: 106px;
`;

const Title = styled.Text`
  margin-top: 7px;
  ${({ theme }) => theme.fonts.brandLogo};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  margin-top: 9px;
  ${({ theme }) => theme.fonts.brandTagline};
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: center;
`;
