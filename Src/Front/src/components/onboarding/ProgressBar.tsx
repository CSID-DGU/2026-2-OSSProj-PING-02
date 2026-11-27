import styled from "styled-components/native";

// 가로 진행 막대 (Figma 08 연락처 불러오는 중: 높이 10 · 모서리 5 · 막대 brandSeed · 바탕 borderDefault)
interface ProgressBarProps {
  value: number; // 0 ~ 1
  accessibilityLabel: string;
  accessibilityText?: string; // 스크린리더가 읽을 현재 값 (예: "45%")
}

const ProgressBar = ({
  value,
  accessibilityLabel,
  accessibilityText,
}: ProgressBarProps) => {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <Track
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percent,
        text: accessibilityText ?? `${percent}%`,
      }}
    >
      <Fill style={{ width: `${percent}%` }} />
    </Track>
  );
};

// 부모 너비를 가득 채움 (가로 줄에 넣을 때는 부모를 flex: 1로)
const Track = styled.View`
  align-self: stretch;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Fill = styled.View`
  height: 100%;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

export default ProgressBar;
