import styled from "styled-components/native";
import { WarningBadgeIcon } from "@core/ui/icon";

// 05 연락 D01·D03 "인식에 실패한 장문 메시지가 있어요" 안내 (누르면 D04 긴 메시지 보완)
// 시안(÷2): 좌우 16 · 높이 약 58 · 모서리 12 · 안쪽 위아래 12 좌 15 · "!" 17 → 9 → 제목
// 글자: 제목 labelNotice 12/19 · 설명 captionQuick 10/15 (디자이너 확인)
// D04 긴 메시지 보완 화면 위에서도 같은 상자를 제목만 바꿔 씀 (누르지 않음: onPress 없음)
// TODO(알림): 잘린 메시지가 10개 쌓이거나 새로 감지될 때 알려 주기 (디자이너 의견, 이번 범위 밖)
interface LongMessageNoticeProps {
  title?: string;
  onPress?: () => void;
}

const LongMessageNotice = ({
  title = "인식에 실패한 장문 메시지가 있어요",
  onPress,
}: LongMessageNoticeProps) => (
  <Box
    onPress={onPress}
    disabled={!onPress}
    accessible
    accessibilityRole={onPress ? "button" : "text"}
    accessibilityLabel={`${title}. 원문을 말씨앗에 보내주세요.`}
  >
    <TitleRow>
      <WarningBadgeIcon size={17} />
      <Title>{title}</Title>
    </TitleRow>
    <Body>원문을 말씨앗에 보내주세요.</Body>
  </Box>
);

const Box = styled.Pressable`
  margin: 0px 16px;
  padding: 12px 15px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 9px;
`;

const Title = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.labelNotice};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Body = styled.Text`
  ${({ theme }) => theme.fonts.captionQuick};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default LongMessageNotice;
