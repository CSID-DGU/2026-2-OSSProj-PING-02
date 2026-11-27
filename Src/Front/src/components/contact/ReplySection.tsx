import styled, { useTheme } from "styled-components/native";
import { Button } from "@core/ui/button";
import { TextArea } from "@core/ui/field";
import { ClipboardIcon } from "@core/ui/icon";
import HelpRow from "@components/home/HelpRow";
import writeImage from "@assets/img/home/malssi-mode-write.png";
import {
  STANCE_DESCRIPTION,
  STANCE_OPTIONS,
  TONE_OPTIONS,
} from "@constants/contact";
import type { HelpMode } from "@constants/homeHelp";
import type { ReplyFlow } from "@hooks/useReplyFlow";

// 05 연락 D03 "답장하기" 구역 (시안 ÷2)
// 제목 "답장하기"(16/22 Bold) 좌 26 → 단계마다 내용
// - 단계 질문 titleSection 14/20 · 선택 상자는 홈 도움 수준 줄(HelpRow)과 같은 모양(labelForm 13/18 + captionRegular 12/17)
//   고르면 바로 다음 단계로
// - 완성 답장 후보: 후보마다 오른쪽 갈색 말풍선(captionRegular). 기본은 후보1
// - 버튼: 도움 수준별 (Figma "Frame" 표)
//   추천 선택(오늘은 미루기·아직 안 고름 포함): 선택한 답장 복사하기 / 선택한 답장 수정하기
//   추천 수정: 선택한 답장 수정하기 / 직접 답장 쓰기
//   직접 쓰기: 처음부터 직접 쓰기 상자 + 작성 완료 (복사는 상자 안 아이콘)
interface ReplySectionProps {
  flow: ReplyFlow;
  mode: HelpMode | null;
  startLabel: string;
  onDefer: () => void;
  onCopy: (text: string) => void;
  // 수정 완료·작성 완료 (보내기 팝업은 다음 덩어리)
  onComplete: (text: string) => void;
}

const ReplySection = ({
  flow,
  mode,
  startLabel,
  onDefer,
  onCopy,
  onComplete,
}: ReplySectionProps) => {
  const theme = useTheme();
  const { step } = flow;

  const title = (
    <Title accessibilityRole="header">답장하기</Title>
  );

  if (step.kind === "start") {
    return (
      <Section>
        {title}
        <Actions $top={9}>
          <Button fullWidth typo="labelButtonCompact" onPress={flow.start}>
            {startLabel}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            typo="labelButtonCompact"
            onPress={onDefer}
          >
            나중에 답하기
          </Button>
        </Actions>
      </Section>
    );
  }

  if (step.kind === "stance" || step.kind === "tone") {
    const isStance = step.kind === "stance";
    const options = isStance
      ? STANCE_OPTIONS.map(o => ({
          value: o.value,
          title: o.label,
          description: STANCE_DESCRIPTION[o.value],
        }))
      : TONE_OPTIONS.map(o => ({
          value: o.value,
          title: o.label,
          description:
            step.candidates.find(c => c.tone === o.value)?.text ?? "",
        })).filter(o => o.description);
    return (
      <Section>
        {title}
        <Question accessibilityRole="header">
          {isStance ? "어떻게 답하고 싶으세요?" : "어떤 말투로 전할까요?"}
        </Question>
        <List accessibilityRole="radiogroup">
          {options.map((o, i) => (
            <HelpRow
              key={o.value}
              title={o.title}
              description={o.description}
              selected={step.selected === o.value}
              divider={i < options.length - 1}
              onPress={() =>
                step.kind === "stance"
                  ? flow.chooseStance(o.value as typeof STANCE_OPTIONS[number]["value"])
                  : flow.chooseTone(o.value as typeof TONE_OPTIONS[number]["value"])
              }
            />
          ))}
        </List>
      </Section>
    );
  }

  if (step.kind === "candidates") {
    const selected = step.candidates[step.selectedIndex];
    const editMode = mode === "edit";
    return (
      <Section>
        {title}
        {/* TODO(Figma 스타일 확인): 단계 설명은 가장 가까운 captionRegular 12/17 */}
        <Description>
          {`${step.stance ? "선택한 입장과 말투에" : "선택한 말투에"} 맞는 답장 ${
            step.candidates.length
          }개가 준비됐어요.`}
        </Description>
        <List accessibilityRole="radiogroup">
          {step.candidates.map((c, i) => (
            <CandidateSlot
              key={c.id}
              $divider={i < step.candidates.length - 1}
            >
              <CandidatePress
                onPress={() => flow.selectCandidate(i)}
                accessibilityRole="radio"
                accessibilityState={{ selected: i === step.selectedIndex }}
                accessibilityLabel={`후보${i + 1}, ${c.text}`}
                $selected={i === step.selectedIndex}
              >
                {/* TODO(Figma 스타일 확인): "후보1"은 가장 가까운 captionRegular 12/17 */}
                <CandidateLabel>{`후보${i + 1}`}</CandidateLabel>
                <BubbleRow>
                  <Bubble>
                    <BubbleText>{c.text}</BubbleText>
                  </Bubble>
                  <Tail />
                </BubbleRow>
              </CandidatePress>
            </CandidateSlot>
          ))}
        </List>
        <Actions $top={12}>
          <Button
            fullWidth
            typo="labelButtonCompact"
            onPress={() =>
              editMode ? flow.editSelected() : onCopy(selected.text)
            }
          >
            {editMode ? "선택한 답장 수정하기" : "선택한 답장 복사하기"}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            typo="labelButtonCompact"
            onPress={editMode ? flow.writeMyself : flow.editSelected}
          >
            {editMode ? "직접 답장 쓰기" : "선택한 답장 수정하기"}
          </Button>
        </Actions>
      </Section>
    );
  }

  if (step.kind === "edit") {
    const write = step.source === "write";
    const empty = !step.text.trim();
    const label = write ? "직접 답장 작성하기" : "선택한 답장";
    return (
      <Section>
        {title}
        {/* TODO(Figma 스타일 확인): 가장 가까운 captionRegular 12/17 */}
        <Description $left={34}>
          {write
            ? "보낼 답장을 처음부터 직접 작성해보세요."
            : "추천 답장을 내 말로 다듬어보세요."}
        </Description>
        <EditBox>
          <TextArea
            label={label}
            accessibilityLabel="답장 내용"
            value={step.text}
            onChangeText={flow.setText}
            maxLength={500}
            minHeight={118}
            typo="bodyReply"
          >
            <CopyButton
              onPress={() => onCopy(step.text)}
              disabled={empty}
              accessibilityRole="button"
              accessibilityLabel="답장 복사하기"
              accessibilityState={{ disabled: empty }}
              hitSlop={16}
            >
              <ClipboardIcon size={16} color={theme.colors.textSecondary} />
            </CopyButton>
          </TextArea>
        </EditBox>
        <Actions $top={10}>
          <Button
            fullWidth
            typo="labelButtonCompact"
            disabled={empty}
            accessibilityHint={empty ? "내용을 적으면 누를 수 있어요" : undefined}
            onPress={() => onComplete(step.text)}
          >
            {write ? "작성 완료" : "수정 완료"}
          </Button>
          {/* 처음부터 직접 쓰기(도움 수준 "직접 쓰기")일 때만: 시안에 없는 자리라 텍스트 버튼으로 작게 (팀 확정)
              TODO(디자이너 공유) */}
          {!flow.canGoBack && (
            <Button variant="text" onPress={onDefer}>
              나중에 답하기
            </Button>
          )}
        </Actions>
      </Section>
    );
  }

  // 미완료·실패: 같은 그림·문구 (디자이너 확인)
  const failed = step.kind === "failed";
  return (
    <Section>
      {title}
      <Waiting>
        {/* TODO(에셋): 답장 준비 그림. 지금은 홈 "직접 쓰기" 캐릭터 */}
        <WaitingImage source={writeImage} accessible={false} />
        {/* TODO(Figma 스타일 확인): 가장 가까운 bodySmall 13/19 */}
        <WaitingText accessibilityLiveRegion="polite">
          아직 말씨가 답장을 준비하고 있어요.
        </WaitingText>
      </Waiting>
      <Actions $top={19}>
        {failed ? (
          <>
            <Button fullWidth typo="labelButtonCompact" onPress={flow.retry}>
              다시 시도하기
            </Button>
            <Button
              variant="secondary"
              fullWidth
              typo="labelButtonCompact"
              onPress={flow.writeMyself}
            >
              직접 답장 쓰기
            </Button>
          </>
        ) : (
          <Button
            fullWidth
            typo="labelButtonCompact"
            onPress={flow.writeMyself}
          >
            직접 답장 쓰기
          </Button>
        )}
      </Actions>
    </Section>
  );
};

const Section = styled.View``;

const Title = styled.Text`
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Question = styled.Text`
  margin-top: 13px;
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text<{ $left?: number }>`
  margin-top: 5px;
  padding-left: ${({ $left }) => $left ?? 26}px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 선택 줄 첫 칸 위 여백(12)이 질문과 겹쳐 보이지 않게 조금 당김
const List = styled.View`
  margin-top: -4px;
  padding: 0px 26px;
`;

const Actions = styled.View<{ $top: number }>`
  gap: 5px;
  margin-top: ${({ $top }) => $top}px;
  padding: 0px 20px;
`;

// 후보 한 칸: 홈 도움 수준 줄과 같은 여백(위 12 · 아래 11 + 구분선)
const CandidateSlot = styled.View<{ $divider: boolean }>`
  padding: 12px 0px ${({ $divider }) => ($divider ? 11 : 0)}px;
  border-bottom-width: ${({ $divider }) => ($divider ? 1 : 0)}px;
  border-bottom-color: ${({ theme }) => theme.colors.borderDefault};
`;

const CandidatePress = styled.Pressable<{ $selected: boolean }>`
  gap: 9px;
  padding: 15px 16px;
  border-radius: 20px;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.stateSelectedBg : "transparent"};
`;

const CandidateLabel = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BubbleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const Bubble = styled.View`
  flex-shrink: 1;
  padding: 10px 17px;
  border-radius: 16px;
  background-color: ${({ theme }) => theme.colors.actionPrimaryBg};
`;

const BubbleText = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.actionPrimaryText};
`;

// 말풍선 오른쪽 꼬리 (세모)
const Tail = styled.View`
  width: 0px;
  height: 0px;
  border-top-width: 5px;
  border-bottom-width: 5px;
  border-left-width: 9px;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-left-color: ${({ theme }) => theme.colors.actionPrimaryBg};
`;

const EditBox = styled.View`
  margin-top: 10px;
  padding: 0px 16px;
`;

// 상자 오른쪽 위 복사 아이콘 (라벨과 같은 줄)
const CopyButton = styled.Pressable`
  position: absolute;
  top: 16px;
  right: 19px;
  width: 16px;
  height: 18px;
  justify-content: center;
  align-items: center;
`;

const Waiting = styled.View`
  align-items: center;
  margin-top: 16px;
  gap: 10px;
`;

const WaitingImage = styled.Image`
  width: 80px;
  height: 80px;
`;

const WaitingText = styled.Text`
  ${({ theme }) => theme.fonts.bodySmall};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default ReplySection;
