import styled, { useTheme } from "styled-components/native";
import { CalendarIcon } from "@core/ui/icon";

// 05 연락 D03 관련 일정 탭: 시안 "관련 일정 빈 상태"만 (팀 확정)
// TODO(캘린더): 이 사람과의 일정 목록·"+ 일정 추가"·새 일정 발견은 캘린더 이슈에서
interface ScheduleEmptyProps {
  name: string;
}

const ScheduleEmpty = ({ name }: ScheduleEmptyProps) => {
  const theme = useTheme();
  return (
    <Wrapper>
      <Title accessibilityRole="header">다가오는 일정</Title>
      <Empty>
        <CalendarIcon size={28} color={theme.colors.iconDefault} />
        {/* TODO(Figma 스타일 확인): 가장 가까운 titleSection 14/20 · captionRegular 12/17 */}
        <EmptyTitle>아직 연결된 일정이 없어요</EmptyTitle>
        <EmptyBody>{`${name}님과 관련된 약속이나 기념일을\n추가해보세요.`}</EmptyBody>
      </Empty>
      <Title accessibilityRole="header" $top={48}>
        지난 일정
      </Title>
      <Muted>아직 지난 일정이 없어요</Muted>
    </Wrapper>
  );
};

const Wrapper = styled.View`
  padding-top: 18px;
`;

const Title = styled.Text<{ $top?: number }>`
  margin-top: ${({ $top }) => $top ?? 0}px;
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Empty = styled.View`
  align-items: center;
  margin-top: 39px;
  gap: 8px;
`;

const EmptyTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const EmptyBody = styled.Text`
  text-align: center;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Muted = styled.Text`
  margin-top: 23px;
  text-align: center;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

export default ScheduleEmpty;
