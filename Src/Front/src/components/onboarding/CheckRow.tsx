import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import styled from "styled-components/native";
import { Card } from "@core/ui/card";
import { Checkbox } from "@core/ui/checkbox";

// 공통 Checkbox(라벨 없이) + Figma 크기(15) 글자를 조합한 선택 줄 (05·06·09)
// - 줄 전체(설명·아래 내용 포함)를 누르면 토글
// - 스크린리더는 줄 전체를 체크박스 하나로 한 번만 읽음 (안쪽 Checkbox는 숨김)
// 공통 Checkbox 라벨은 13이라 Figma(15~17)와 맞지 않아 이렇게 조합함
export type CheckRowCard = "none" | "default" | "selected";

interface CheckRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  card?: CheckRowCard;
  labelTone?: "primary" | "brand"; // 05 앱 이름은 브라운
  centered?: boolean; // 체크 줄을 가운데에 (05 앱 칸)
  // 체크 줄 아래에 함께 누를 내용 (05 앱 아이콘)
  children?: ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
}

const CheckRow = ({
  checked,
  onToggle,
  label,
  description,
  card = "none",
  labelTone = "primary",
  centered = false,
  children,
  accessibilityHint,
  style,
  cardStyle,
}: CheckRowProps) => {
  const content = (
    <>
      <Row $centered={centered}>
        <HiddenFromReader
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {/* 라벨은 옆 Text로 따로 그림. 빈 라벨이라 박스 오른쪽에 10dp 간격만 남음 */}
          <Checkbox label="" checked={checked} onChange={onToggle} />
        </HiddenFromReader>
        <Texts>
          <Label $tone={labelTone}>{label}</Label>
          {description && <Description>{description}</Description>}
        </Texts>
      </Row>
      {children}
    </>
  );

  return (
    <Press
      onPress={onToggle}
      accessible
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      accessibilityHint={accessibilityHint}
      style={style}
    >
      {card === "none" ? (
        content
      ) : (
        <Card variant={card} style={cardStyle}>
          {content}
        </Card>
      )}
    </Press>
  );
};

const Press = styled.Pressable`
  min-height: 48px;
  justify-content: center;
`;

const Row = styled.View<{ $centered: boolean }>`
  flex-direction: row;
  align-items: center;
  ${({ $centered }) => ($centered ? "align-self: center;" : "")}
`;

const HiddenFromReader = styled.View``;

const Texts = styled.View`
  flex-shrink: 1;
  gap: 2px;
`;

// Figma 15~17 → 토큰 중 가장 가까운 Label/Button(15/22)
const Label = styled.Text<{ $tone: "primary" | "brand" }>`
  ${({ theme }) => theme.fonts.labelButton};
  color: ${({ theme, $tone }) =>
    $tone === "brand" ? theme.colors.textBrand : theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default CheckRow;
