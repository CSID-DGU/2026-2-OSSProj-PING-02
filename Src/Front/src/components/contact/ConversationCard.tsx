import { ActivityIndicator, StyleSheet } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Card, CardDescription } from "@core/ui/card";
import {
  APP_LABEL,
  KIND_LABEL,
  formatRelative,
  formatRemind,
} from "@constants/contact";
import type { ConversationSummary } from "@services";

// 연락 카드 (홈 1:1·단톡 요약, 연락 목록 공통)
// - 분석 완료: 요약
// - 분석 중: "정리하는 중"
// - 분석 실패: 요약 없이 받은 메시지 그대로 (기본 카드)
interface ConversationCardProps {
  item: ConversationSummary;
  onPress: () => void;
}

const ConversationCard = ({ item, onPress }: ConversationCardProps) => {
  const theme = useTheme();
  const { conversation, lastMessage, analysis, deferred, replied } = item;
  const showSummary = analysis.status === "done" && !!analysis.summary;
  const analyzing = analysis.status === "pending";

  const body = showSummary
    ? analysis.summary!
    : conversation.kind === "group"
    ? `${lastMessage.senderName}: ${lastMessage.text}`
    : lastMessage.text;

  const badges = [
    APP_LABEL[conversation.app],
    KIND_LABEL[conversation.kind],
    analysis.mentionsMe ? "나를 언급" : null,
    deferred ? formatRemind(deferred.remindAt) : null,
    replied ? "답장함" : null,
  ].filter(Boolean) as string[];

  const time = formatRelative(conversation.lastMessageAt);

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${conversation.title}, ${time}. ${
        analyzing ? "정리하는 중" : body
      }. ${badges.join(", ")}`}
      accessibilityHint="눌러서 자세히 봐요"
    >
      <TitleRow>
        {/* 긴 이름·단톡방 이름은 한 줄로 말줄임, 시간은 항상 보이게 */}
        <Title numberOfLines={1}>{conversation.title}</Title>
        <Time>{`· ${time}`}</Time>
      </TitleRow>

      {analyzing ? (
        <Analyzing>
          <ActivityIndicator size="small" color={theme.colors.iconSubtle} />
          <CardDescription style={styles.noTop}>정리하는 중…</CardDescription>
        </Analyzing>
      ) : (
        <CardDescription numberOfLines={2}>{body}</CardDescription>
      )}

      <Badges>
        {badges.map(b => (
          <Badge key={b} $strong={b === "나를 언급"}>
            <BadgeText $strong={b === "나를 언급"}>{b}</BadgeText>
          </Badge>
        ))}
      </Badges>
    </Card>
  );
};

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const Title = styled.Text`
  flex-shrink: 1;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Time = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const Analyzing = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
`;

const Badges = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

// "나를 언급"은 색 + 글자 굵기로 함께 구분
const Badge = styled.View<{ $strong: boolean }>`
  padding: 2px 8px;
  border-radius: 999px;
  background-color: ${({ theme, $strong }) =>
    $strong ? theme.colors.stateSelectedBg : theme.colors.backgroundSubtle};
`;

const BadgeText = styled.Text<{ $strong: boolean }>`
  ${({ theme, $strong }) =>
    $strong ? theme.fonts.labelCompact : theme.fonts.captionSmall};
  color: ${({ theme, $strong }) =>
    $strong ? theme.colors.stateSelectedContent : theme.colors.textSecondary};
`;

const styles = StyleSheet.create({ noTop: { marginTop: 0 } });

export default ConversationCard;
