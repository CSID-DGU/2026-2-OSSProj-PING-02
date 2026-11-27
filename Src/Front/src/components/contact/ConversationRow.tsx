import styled from "styled-components/native";
import { Checkbox } from "@core/ui/checkbox";
import {
  APP_ICON,
  APP_LABEL,
  formatRelative,
  isMustCare,
} from "@constants/contact";
import type { ConversationSummary } from "@services";

// 05 연락 D01 연락 목록 · D02 분석 대화방 관리 공통 줄 (720px 시안 ÷2)
// 줄 높이 72 · 왼쪽 28 · 아바타 44 → 12 → 이름(+ 꼭 챙길 연락 "!")·요약 / 오른쪽 30 안쪽에 시간·메신저 로고
// 글자: 이름 titleSection 14/20 · 요약 captionDense 11/12 · 시간 captionHero 11/17 (디자이너 확인)
// TODO(06 친구): 같은 사람의 여러 메신저를 한 줄로 묶기 (시안은 로고 여러 개). 지금은 대화방 1개 = 1줄
interface ConversationRowProps {
  item: ConversationSummary;
  onPress: () => void;
  // 시간 자리에 다른 문구 (미뤄둔 답장: "3일 뒤 다시 보기")
  meta?: string;
  // D02: 왼쪽 체크 박스. 있으면 줄 전체가 체크 박스처럼 동작
  checked?: boolean;
}

const ConversationRow = ({
  item,
  onPress,
  meta,
  checked,
}: ConversationRowProps) => {
  const { conversation, lastMessage, analysis } = item;
  const selectable = checked !== undefined;
  const mustCare = isMustCare(item);
  const analyzing = analysis.status === "pending";
  const body = analyzing
    ? "정리하는 중…"
    : analysis.status === "done" && analysis.summary
    ? analysis.summary
    : conversation.kind === "group"
    ? `${lastMessage.senderName}: ${lastMessage.text}`
    : lastMessage.text;
  const time = meta ?? formatRelative(conversation.lastMessageAt);

  const label = [
    conversation.title,
    mustCare ? "꼭 챙길 연락" : null,
    time,
    body,
    APP_LABEL[conversation.app],
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Row
      onPress={onPress}
      accessibilityRole={selectable ? "checkbox" : "button"}
      accessibilityState={selectable ? { checked } : undefined}
      accessibilityLabel={label}
      accessibilityHint={selectable ? undefined : "눌러서 자세히 봐요"}
    >
      {selectable && (
        // 체크 박스는 모양만 (누르기·읽기는 줄 전체가 맡음)
        <CheckSlot
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          <Checkbox checked={!!checked} onChange={() => {}} label="" />
        </CheckSlot>
      )}
      {/* TODO(에셋): 기본 프로필 그림 (Figma에서 내보내면 교체) */}
      <Avatar />
      <Texts>
        <NameRow>
          {/* TODO(에셋): 노란 "!" 아이콘 (Figma에서 내보내면 교체) */}
          {mustCare && (
            <Mark>
              <MarkText>!</MarkText>
            </Mark>
          )}
          <Name numberOfLines={1}>{conversation.title}</Name>
        </NameRow>
        <Summary numberOfLines={2}>{body}</Summary>
      </Texts>
      <Side>
        <Time numberOfLines={1}>{time}</Time>
        <Logos>
          <Logo source={APP_ICON[conversation.app]} accessible={false} />
        </Logos>
      </Side>
    </Row>
  );
};

const Row = styled.Pressable`
  flex-direction: row;
  align-items: center;
  height: 72px;
  padding: 0px 30px 0px 28px;
  gap: 12px;
`;

// 체크 박스 20dp. Checkbox는 라벨 자리(10dp)가 오른쪽에 붙어 있어 폭을 20으로 잘라 둠
const CheckSlot = styled.View`
  width: 20px;
  overflow: hidden;
`;

const Avatar = styled.View`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  border-width: 3px;
  border-color: ${({ theme }) => theme.colors.brandBrown};
  background-color: ${({ theme }) => theme.colors.surfaceSeed};
`;

const Texts = styled.View`
  flex: 1;
  gap: 4px;
`;

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 7px;
`;

const Mark = styled.View`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const MarkText = styled.Text`
  ${({ theme }) => theme.fonts.labelCompact};
  color: ${({ theme }) => theme.colors.textOnDark};
`;

const Name = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Summary = styled.Text`
  ${({ theme }) => theme.fonts.captionDense};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Side = styled.View`
  align-items: flex-end;
  gap: 5px;
`;

const Time = styled.Text`
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Logos = styled.View`
  flex-direction: row;
  gap: 1px;
`;

const Logo = styled.Image`
  width: 16px;
  height: 16px;
  border-radius: 4px;
`;

export default ConversationRow;
