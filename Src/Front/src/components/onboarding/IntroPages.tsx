import { useState } from "react";
import { Image } from "react-native";
import styled, { css } from "styled-components/native";
import { ChoiceGroup } from "@core/ui/choice";
import AuthIntro from "@components/auth/AuthIntro";
import {
  ONBOARDING_ICONS,
  ONBOARDING_IMAGES,
  type OnboardingImage,
} from "@constants/onboardingImages";
import Illustration from "./Illustration";

// 02-1 ~ 02-5 서비스 소개 각 쪽의 내용 (ServiceIntro가 가로로 넘김)

// ───────── 말풍선 (02-2·02-4) ─────────
// sent: 내가 보낼 답장(브라운, 오른쪽 꼬리) / received: 받은 연락(노랑, 왼쪽 꼬리)
type BubbleKind = "sent" | "received";

const Bubble = ({ kind, children }: { kind: BubbleKind; children: string }) => (
  <BubbleRow $kind={kind}>
    {kind === "received" && <Tail $kind={kind} />}
    <BubbleBox $kind={kind}>
      <BubbleText $kind={kind}>{children}</BubbleText>
    </BubbleBox>
    {kind === "sent" && <Tail $kind={kind} />}
  </BubbleRow>
);

// ───────── 아이콘 + 이름 묶음 (02-3·02-4) ─────────
const IconRow = ({
  items,
}: {
  items: { image: OnboardingImage; label: string }[];
}) => (
  <Icons>
    {items.map(item => (
      <IconItem key={item.label}>
        <Image
          source={item.image.source}
          style={{ width: item.image.width, height: item.image.height }}
          accessibilityIgnoresInvertColors
          importantForAccessibility="no"
        />
        <IconLabel>{item.label}</IconLabel>
      </IconItem>
    ))}
  </Icons>
);

// ───────── 각 쪽 ─────────
const PageConnection = () => (
  <>
    <AuthIntro
      variant="onboarding"
      title={"작은 한마디가,\n다시 이어질 씨앗이 되도록"}
      description={"답이 늦었어도 괜찮아요.\n지금 건넬 수 있는 말부터 함께 찾아요"}
    />
    <Illustration image={ONBOARDING_IMAGES.introConnection} />
    <Caption>
      {"작은 한마디를 건네면,\n멈춘 대화도 다시 이어질 수 있어요"}
    </Caption>
  </>
);

const REPLY_EXAMPLES = [
  {
    label: "질문은 수락 · 거절 · 보류",
    reply: "오늘은 조금 어려울 것 같아. 다음에 보자.",
  },
  {
    label: "축하 · 안부는 원하는 말투로",
    reply: "연락해줘서 고마워. 잘 지내고 있지?",
  },
  {
    label: "단톡 · 정보는 요약부터",
    reply: "모임 시간이 토요일 오후 3시로 바뀌었어요.",
  },
];

const PageReply = () => (
  <>
    <AuthIntro
      variant="onboarding"
      title={"먼저 온 연락,\n부담 없이 답해요"}
      description={
        "메시지의 성격을 먼저 살펴보고,\n질문은 내 입장에 맞게, 안부는 원하는 말투로 제안해요"
      }
    />
    <Examples>
      {REPLY_EXAMPLES.map((example, i) => (
        <Example key={example.label}>
          {/* Figma 02-2: 라벨은 화면 가운데, 말풍선은 오른쪽 끝(꼬리가 본문 여백에 닿게) */}
          <ExampleLabel>{`${CIRCLED[i]} ${example.label}`}</ExampleLabel>
          <Bubble kind="sent">{example.reply}</Bubble>
        </Example>
      ))}
    </Examples>
    <Caption>메시지에 따라 필요한 선택만 보여드려요</Caption>
  </>
);

const PageReconnect = () => (
  <>
    <AuthIntro
      variant="onboarding"
      title={"먼저 다시 말을\n걸고 싶을 때에도"}
      description={
        "오래 연락하지 못한 지인에게 가벼운 계기를 만들어\n다시 첫마디를 건넬 수 있도록 도와요"
      }
    />
    <IconRow
      items={[
        { image: ONBOARDING_ICONS.birthday, label: "생일 축하하기" },
        { image: ONBOARDING_ICONS.heart, label: "오랜만에\n안부 묻기" },
        { image: ONBOARDING_ICONS.chat, label: "고마웠던 마음\n전하기" },
        { image: ONBOARDING_ICONS.wave, label: "부담없이\n다시 인사하기" },
      ]}
    />
    <Illustration image={ONBOARDING_IMAGES.introFirstContact} />
    <Caption>
      {"길게 해명하거나 과하게 사과하지 않아도 괜찮아요\n지금 건넬 수 있는 말부터 시작해요"}
    </Caption>
  </>
);

// 02-4: 답장 방향 칩을 누르면 아래 답장이 바뀜 (하나만 고르는 선택 → ChoiceGroup chip)
const WEDDING_REPLIES = [
  {
    label: "참석할게요",
    value: "attend",
    reply: "초대해줘서 고마워! 결혼 정말 축하해. 그날 꼭 갈게.",
  },
  {
    label: "확인해볼게요",
    value: "check",
    reply: "초대해줘서 고마워! 일정 확인해보고 다시 연락할게.",
  },
  {
    label: "참석이 어려워요",
    value: "decline",
    reply: "정말 축하해! 그날은 어려울 것 같아서 마음만 먼저 보낼게.",
  },
];

const PageImportant = () => {
  const [choice, setChoice] = useState("attend");
  const reply = WEDDING_REPLIES.find(r => r.value === choice)?.reply ?? "";

  return (
    <>
      <AuthIntro
        variant="onboarding"
        title={"중요한 연락,\n한눈에 정리해요"}
        description={
          "메시지 속 날짜·장소·요청사항을 정리하고,\n필요한 답장과 일정을 제안해요"
        }
      />
      <IconRow
        items={[
          { image: ONBOARDING_ICONS.occasion, label: "경조사·약속" },
          { image: ONBOARDING_ICONS.work, label: "업무·기관" },
          { image: ONBOARDING_ICONS.counseling, label: "상담·진료" },
        ]}
      />
      <Examples>
        <Bubble kind="received">
          {"오랜만이야! 12월 12일 오후 1시에 결혼식을 올려.\n시간 괜찮으면 와서 축하해주면 좋겠어!"}
        </Bubble>
        <Chips>
          <ChoiceGroup
            shape="chip"
            options={WEDDING_REPLIES.map(({ label, value }) => ({
              label,
              value,
            }))}
            value={choice}
            onChange={setChoice}
          />
        </Chips>
        <Bubble kind="sent">{reply}</Bubble>
      </Examples>
      <Caption>
        {"친구와 지인뿐 아니라 업무·상담·진료 등 확인이 필요한\n연락에도 활용할 수 있어요"}
      </Caption>
    </>
  );
};

const PageMemory = () => (
  <>
    <AuthIntro
      variant="onboarding"
      title={"내 생활을 담아,\n내 말처럼"}
      description={
        "요즘 어떻게 지내는지, 상대에게 무엇을 어디까지 이야기하고\n싶은지 정해두면 그 범위 안에서 답장을 제안해요"
      }
    />
    <Illustration image={ONBOARDING_IMAGES.introSituationCard} />
    <Caption>
      {"입력은 선택사항이며,\n등록한 내용은 언제든 수정하거나 삭제할 수 있어요"}
    </Caption>
  </>
);

export const INTRO_PAGES = [
  PageConnection,
  PageReply,
  PageReconnect,
  PageImportant,
  PageMemory,
];

// ───────── 스타일 ─────────
const Caption = styled.Text`
  ${({ theme }) => theme.fonts.bodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const Examples = styled.View`
  gap: 12px;
`;

const Example = styled.View`
  gap: 4px;
`;

const ExampleLabel = styled.Text`
  align-self: stretch;
  text-align: center;
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// Figma 02-2의 번호 표시 (❶❷❸)
const CIRCLED = ["❶", "❷", "❸"];

const BubbleRow = styled.View<{ $kind: BubbleKind }>`
  flex-direction: row;
  align-items: center;
  max-width: 100%;
  align-self: ${({ $kind }) => ($kind === "sent" ? "flex-end" : "flex-start")};
`;

const BubbleBox = styled.View<{ $kind: BubbleKind }>`
  flex-shrink: 1;
  padding: 12px 18px;
  border-radius: 12px;
  background-color: ${({ theme, $kind }) =>
    $kind === "sent" ? theme.colors.actionPrimaryBg : theme.colors.brandSeed};
`;

const BubbleText = styled.Text<{ $kind: BubbleKind }>`
  ${({ theme }) => theme.fonts.bodyLarge};
  color: ${({ theme, $kind }) =>
    $kind === "sent" ? theme.colors.actionPrimaryText : theme.colors.textPrimary};
`;

// 말풍선 꼬리 (테두리로 만든 삼각형)
const Tail = styled.View<{ $kind: BubbleKind }>`
  width: 0px;
  height: 0px;
  border-top-width: 6px;
  border-bottom-width: 6px;
  border-top-color: transparent;
  border-bottom-color: transparent;
  ${({ theme, $kind }) =>
    $kind === "sent"
      ? css`
          border-left-width: 9px;
          border-left-color: ${theme.colors.actionPrimaryBg};
        `
      : css`
          border-right-width: 9px;
          border-right-color: ${theme.colors.brandSeed};
        `}
`;

const Chips = styled.View`
  align-items: flex-end;
`;

const Icons = styled.View`
  flex-direction: row;
  justify-content: space-around;
`;

const IconItem = styled.View`
  flex: 1;
  align-items: center;
  gap: 8px;
`;

const IconLabel = styled.Text`
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textBrand};
  text-align: center;
`;
