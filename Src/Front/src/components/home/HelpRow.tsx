import styled from "styled-components/native";

// 04 홈 C02~C05 선택 줄 (제목 + 설명, 선택하면 연노랑 둥근 바탕)
// 시안: 줄 높이 72, 모서리 16, 위 12 · 아래 11 간격, 줄 사이 구분선 1 (borderDefault)
// 선택 표시는 시안대로 노란 둥근 상자만 (체크 아이콘 없음, #53 팀 확정)
// 대신 화면 읽기 프로그램에는 radio + selected 상태로 꼭 알림
interface HelpRowProps {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  // 아래 구분선 (C02는 마지막 줄 아래 없음, C03~C05는 있음)
  divider: boolean;
}

const HelpRow = ({
  title,
  description,
  selected,
  onPress,
  divider,
}: HelpRowProps) => (
  <Slot $divider={divider}>
    <Press
      onPress={onPress}
      $selected={selected}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${description}`}
    >
      <Title numberOfLines={1}>{title}</Title>
      <Description numberOfLines={1}>{description}</Description>
    </Press>
  </Slot>
);

const Slot = styled.View<{ $divider: boolean }>`
  padding: 12px 0px ${({ $divider }) => ($divider ? 11 : 0)}px;
  border-bottom-width: ${({ $divider }) => ($divider ? 1 : 0)}px;
  border-bottom-color: ${({ theme }) => theme.colors.borderDefault};
`;

const Press = styled.Pressable<{ $selected: boolean }>`
  height: 72px;
  padding: 15px 16px 0px;
  border-radius: 16px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedBg : "transparent"};
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  margin-top: 6px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default HelpRow;
