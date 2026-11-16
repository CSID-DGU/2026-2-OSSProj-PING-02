import styled from "styled-components/native";
import ProgressBar from "./ProgressBar";

// 헤더 아래 진행 단계 표시 (막대 + "2 / 6")
export interface StepProgressProps {
  current: number;
  total: number;
}

const StepProgress = ({ current, total }: StepProgressProps) => {
  const text = `${total}단계 중 ${current}단계`;

  return (
    <Wrapper>
      <Bar>
        <ProgressBar
          value={current / total}
          accessibilityLabel="진행 단계"
          accessibilityText={text}
        />
      </Bar>
      <Count importantForAccessibility="no" accessibilityElementsHidden>
        {`${current} / ${total}`}
      </Count>
    </Wrapper>
  );
};

const Wrapper = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 4px 20px 8px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Bar = styled.View`
  flex: 1;
`;

const Count = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export default StepProgress;
