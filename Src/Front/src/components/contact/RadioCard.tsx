import { Pressable } from "react-native";
import styled from "styled-components/native";
import { Card } from "@core/ui/card";

// 답장 후보 고르기 줄 (Figma 09-A·09-B·09-C의 ○/● 카드)
// 공통 Card + 동그라미 표시를 조합 (선택 상태는 색 + 채워진 동그라미 + 굵은 테두리로 함께 구분)
// TODO(디자이너 공유): 공통 라디오 컴포넌트가 없어 Card 조합으로 만듦. 시안 확정 후 모양 확인
interface RadioCardProps {
  selected: boolean;
  onSelect: () => void;
  // 앞쪽 짧은 이름 (예: 수락, 다정하게). 없으면 문장만
  label?: string;
  text: string;
}

const RadioCard = ({ selected, onSelect, label, text }: RadioCardProps) => (
  <Pressable
    onPress={onSelect}
    accessible
    accessibilityRole="radio"
    accessibilityState={{ selected, checked: selected }}
    accessibilityLabel={label ? `${label}, ${text}` : text}
  >
    <Card variant={selected ? "selected" : "default"}>
      <Row>
        <Circle $selected={selected}>{selected && <Dot />}</Circle>
        <Body>
          {label && <Label>{label}</Label>}
          <Text $selected={selected}>{text}</Text>
        </Body>
      </Row>
    </Card>
  </Pressable>
);

const Row = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
`;

const Circle = styled.View<{ $selected: boolean }>`
  width: 20px;
  height: 20px;
  margin-top: 2px;
  border-radius: 10px;
  border-width: 2px;
  align-items: center;
  justify-content: center;
  border-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedContent : theme.colors.borderStrong};
`;

const Dot = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.stateSelectedContent};
`;

const Body = styled.View`
  flex: 1;
  gap: 2px;
`;

const Label = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.textBrand};
`;

const Text = styled.Text<{ $selected: boolean }>`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default RadioCard;
