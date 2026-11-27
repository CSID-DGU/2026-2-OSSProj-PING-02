import styled, { useTheme } from "styled-components/native";
import { ChevronRightIcon } from "@core/ui/icon";
import type { RawMessageStats } from "@services";

// 06 친구 E03-2 상세 원문 관리 (720px ÷2)
// 줄 3개(간격 72, 왼쪽 30): 저장된 원문(최근 한 달 간 N개, ">") · 다음 자동 삭제 날짜 · 최근 자동 삭제 날짜
// - 저장된 원문 ">": 이 친구의 최근 1:1 대화(08 연락 상세)로. 대화가 없으면 누르지 않음
// - 다음 자동 삭제 날짜 = 가장 오래된 원문 + 보관 기간(30일)
// TODO(Figma 문구 확인): 저장된 원문이 없을 때 다음 삭제 날짜 문구는 시안 없음
// TODO(Figma 스타일 확인): 제목 약 15 Bold → titleCard 14/20, 설명 약 12 → captionRegular 12/17
interface RawMessagesPanelProps {
  stats: RawMessageStats;
  onOpenMessages?: () => void;
}

// 2026-12-21 → "2026.12.21"
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

const RawMessagesPanel = ({ stats, onOpenMessages }: RawMessagesPanelProps) => {
  const theme = useTheme();
  const count = `최근 한 달 간 ${stats.recentCount}개`;
  const next = stats.nextDeleteAt
    ? formatDate(stats.nextDeleteAt)
    : "아직 저장된 원문이 없어요.";
  const last = stats.lastDeletedAt
    ? formatDate(stats.lastDeletedAt)
    : "아직 삭제된 이력이 존재하지 않아요.";

  return (
    <Wrapper>
      <Row
        onPress={onOpenMessages}
        disabled={!onOpenMessages}
        accessibilityRole={onOpenMessages ? "button" : undefined}
        accessibilityLabel={`저장된 원문, ${count}`}
        accessibilityHint={onOpenMessages ? "눌러서 최근 대화를 봐요" : undefined}
      >
        <Texts>
          <Title>저장된 원문</Title>
          <Description>{count}</Description>
        </Texts>
        {onOpenMessages && (
          <ChevronRightIcon size={21} color={theme.colors.iconSubtle} />
        )}
      </Row>
      <Row accessible accessibilityLabel={`다음 자동 삭제 날짜, ${next}`}>
        <Texts>
          <Title>다음 자동 삭제 날짜</Title>
          <Description>{next}</Description>
        </Texts>
      </Row>
      <Row accessible accessibilityLabel={`최근 자동 삭제 날짜, ${last}`}>
        <Texts>
          <Title>최근 자동 삭제 날짜</Title>
          <Description>{last}</Description>
        </Texts>
      </Row>
    </Wrapper>
  );
};

// 하위 탭 아래 첫 줄 가운데까지 약 51
const Wrapper = styled.View`
  padding-top: 15px;
  padding-bottom: 24px;
`;

const Row = styled.Pressable`
  height: 72px;
  flex-direction: row;
  align-items: center;
  padding: 0px 39px 0px 30px;
`;

const Texts = styled.View`
  flex: 1;
  gap: 4px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.titleCard};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default RawMessagesPanel;
