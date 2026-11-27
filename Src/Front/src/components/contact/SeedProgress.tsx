import styled from "styled-components/native";
import seedColor from "@assets/img/contact/seed-color.png";
import seedGray from "@assets/img/contact/seed-gray.png";

// 05 연락 D04 긴 메시지 보완 진행 표시 (시안 ÷2)
// 잘린 메시지 한 건 = 씨앗 하나. 지금 보완하는 건까지 색 있는 말씨앗, 남은 건 회색 씨앗
// 많으면 줄을 바꿔 모두 보여 줌 (팀 확정)
// 그림 46×45(그림자 여백 포함) · 씨앗 사이 간격 40 → 상자끼리 6씩 겹침
// 에셋: 1x 파일이 없어 2x를 1x 이름으로도 씀 (1x 화면 기기에서만 쓰임)
interface SeedProgressProps {
  total: number;
  colored: number;
}

const SeedProgress = ({ total, colored }: SeedProgressProps) => (
  <Row
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel={`${total}건 중 ${colored}건째 보완`}
    accessibilityValue={{ min: 0, max: total, now: colored }}
  >
    {Array.from({ length: total }, (_, i) => (
      <Seed
        key={i}
        source={i < colored ? seedColor : seedGray}
        accessible={false}
      />
    ))}
  </Row>
);

const Row = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0px 20px;
`;

const Seed = styled.Image`
  width: 46px;
  height: 45px;
  margin: 0px -3px;
`;

export default SeedProgress;
