import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { ChevronRightIcon } from "@core/ui/icon";

// 08 설정 H07 저장된 데이터의 줄·상세 상자 (Figma 534:23413)
// - 줄: 설정 메뉴 줄과 같은 카드(좌우 16·위아래 10) + 오른쪽 18dp 꺾쇠 (이동 ">", 펼침 "∨", 접기 "∧")
// - 상세 상자: backgroundBase 바탕·borderDefault 테두리·모서리 15·안쪽 20, 줄(높이 26) + 작은 버튼(높이 40)

type Chevron = "right" | "down" | "up";

interface DataRowProps {
  title: string;
  description?: string;
  chevron: Chevron;
  onPress: () => void;
  expanded?: boolean;
}

const ROTATION: Record<Chevron, string> = {
  right: "0deg",
  down: "90deg",
  up: "-90deg",
};

export const DataRow = ({
  title,
  description,
  chevron,
  onPress,
  expanded,
}: DataRowProps) => {
  const theme = useTheme();
  return (
    <Row
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
    >
      <Texts>
        <Title>{title}</Title>
        {!!description && <Description>{description}</Description>}
      </Texts>
      <ChevronBox $rotate={ROTATION[chevron]}>
        <ChevronRightIcon size={18} color={theme.colors.iconDefault} />
      </ChevronBox>
    </Row>
  );
};

interface DataDetailProps {
  rows: { label: string; value: string }[];
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}

export const DataDetail = ({
  rows,
  actionLabel,
  onAction,
  actionDisabled,
}: DataDetailProps) => (
  <Box>
    {rows.map((row) => (
      <DetailRow
        key={row.label}
        accessible
        accessibilityLabel={`${row.label} ${row.value}`}
      >
        <DetailLabel>{row.label}</DetailLabel>
        <DetailValue>{row.value}</DetailValue>
      </DetailRow>
    ))}
    {/* 0개일 때도 시안처럼 같은 모양으로 보이되 누를 수 없음 */}
    <SmallButton
      variant="secondary"
      fullWidth
      onPress={actionDisabled ? undefined : onAction}
      accessibilityLabel={actionLabel}
      accessibilityState={{ disabled: !!actionDisabled }}
    >
      <SmallLabel>{actionLabel}</SmallLabel>
    </SmallButton>
  </Box>
);

const Row = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.surfaceDefault};
`;

const Texts = styled.View`
  flex: 1;
  gap: 4px;
`;

const Title = styled.Text`
  min-height: 19.5px;
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  min-height: 18px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ChevronBox = styled.View<{ $rotate: string }>`
  width: 18px;
  height: 18px;
  transform: rotate(${({ $rotate }) => $rotate});
`;

const Box = styled.View`
  gap: 5px;
  padding: 20px;
  border-radius: 15px;
  border: 1px solid ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

const DetailRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0px 10px;
`;

const DetailLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelDataRow};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DetailValue = styled.Text`
  ${({ theme }) => theme.fonts.labelLink};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 시안 버튼은 높이 40 (공통 Button은 48)
const SmallButton = styled(Button)`
  height: 40px;
`;

const SmallLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelButtonSmall};
  color: ${({ theme }) => theme.colors.textTertiary};
`;
