import { useState } from "react";
import styled, { useTheme } from "styled-components/native";
import { ChevronDownIcon } from "@core/ui/icon";
import { APP_ICON, APP_LABEL, formatRelative } from "@constants/contact";
import type { Message, MessengerApp } from "@services";

// 05 연락 D03 "요약" / D05 "전체 대화"·"나를 언급한 내용"·"답장 필요" 구역 (시안 ÷2)
// 제목 줄 오른쪽 "원문 확인하기 ∨": 누르면 카드 위에 원문 말풍선(연한 파랑 영역)을 펼침
// 요약 카드: 좌우 16 · 모서리 16 · 테두리 borderDefault · 바탕 backgroundBase
//   메신저 로고 35 → 14 → (카드 제목) + 요약(captionRegular 12/17) / 오른쪽 위 받은 시각
interface SummaryBlockProps {
  title: string;
  // "section": D03 "요약"(16/22 Bold) / "sub": D05 소제목 "전체 대화" 등
  titleSize: "section" | "sub";
  cardTitle?: string;
  body: string;
  app: MessengerApp;
  receivedAt: string;
  // 원문 확인하기로 보여 줄 메시지 (없으면 버튼 없음)
  messages: Message[];
  // "message": D04 "확인된 내용" 잘린 메시지 카드
  //   보낸 사람(cardTitle, titleSection 14/20 SemiBold) · 본문 captionDense 11/12 두 줄 ·
  //   시각은 받은 시각(captionHero 11/17, 오늘이면 "8:45")을 이름 줄 높이에
  variant?: "summary" | "message";
}

// "8:45" (오늘) / 그 전은 "11월 25일"
const formatClock = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString()
    ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
    : `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const SummaryBlock = ({
  title,
  titleSize,
  cardTitle,
  body,
  app,
  receivedAt,
  messages,
  variant = "summary",
}: SummaryBlockProps) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const message = variant === "message";
  const time = message ? formatClock(receivedAt) : formatRelative(receivedAt);

  return (
    <Wrapper>
      <HeaderRow>
        {titleSize === "section" ? (
          <SectionTitle accessibilityRole="header">{title}</SectionTitle>
        ) : (
          <SubTitle accessibilityRole="header">{title}</SubTitle>
        )}
        {messages.length > 0 && (
          <Toggle
            onPress={() => setOpen(o => !o)}
            accessibilityRole="button"
            accessibilityLabel={`${title} 원문 확인하기`}
            accessibilityState={{ expanded: open }}
            hitSlop={14}
          >
            {/* TODO(Figma 스타일 확인): 가장 가까운 labelLink 11/17 */}
            <ToggleText>원문 확인하기</ToggleText>
            <Flip $open={open}>
              <ChevronDownIcon size={9} color={theme.colors.textSecondary} />
            </Flip>
          </Toggle>
        )}
      </HeaderRow>

      {open && (
        <Originals accessibilityLabel={`${title} 원문`}>
          {messages.map(m => (
            <BubbleRow key={m.id}>
              <Tail />
              <Bubble>
                {/* TODO(Figma 스타일 확인): 가장 가까운 captionRegular 12/17 */}
                <BubbleText>{m.truncated ? `${m.text}…` : m.text}</BubbleText>
              </Bubble>
            </BubbleRow>
          ))}
        </Originals>
      )}

      <Card
        accessible
        accessibilityLabel={[title, cardTitle, body, time, APP_LABEL[app]]
          .filter(Boolean)
          .join(". ")}
        $titled={!!cardTitle}
      >
        <Logo source={APP_ICON[app]} accessible={false} />
        <Texts>
          {cardTitle && <CardTitle>{cardTitle}</CardTitle>}
          {message ? (
            <MessageBody numberOfLines={2}>{body}</MessageBody>
          ) : (
            <Body>{body}</Body>
          )}
        </Texts>
        <Time $top={message ? 17 : 9}>{time}</Time>
      </Card>
    </Wrapper>
  );
};

const Wrapper = styled.View`
  gap: 4px;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0px 18px 0px 26px;
`;

const SectionTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// TODO(Figma 스타일 확인): D05 소제목은 가장 가까운 titleSection 14/20
const SubTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Toggle = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 5px;
`;

const ToggleText = styled.Text`
  ${({ theme }) => theme.fonts.labelLink};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Flip = styled.View<{ $open: boolean }>`
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const Originals = styled.View`
  margin: 0px 16px;
  padding: 20px 20px 20px 20px;
  gap: 5px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.colors.feedbackInfoBg};
`;

const BubbleRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

// 말풍선 왼쪽 꼬리 (세모)
const Tail = styled.View`
  width: 0px;
  height: 0px;
  border-top-width: 5px;
  border-bottom-width: 5px;
  border-right-width: 9px;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-right-color: ${({ theme }) => theme.colors.brandSeed};
`;

const Bubble = styled.View`
  flex-shrink: 1;
  padding: 11px 14px;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.colors.brandSeed};
`;

const BubbleText = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Card = styled.View<{ $titled: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 14px;
  min-height: 77px;
  margin: 0px 16px;
  padding: ${({ $titled }) => ($titled ? 11 : 21)}px 27px
    ${({ $titled }) => ($titled ? 11 : 21)}px 24px;
  border-radius: 16px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.borderDefault};
  background-color: ${({ theme }) => theme.colors.backgroundBase};
`;

const Logo = styled.Image`
  width: 35px;
  height: 35px;
  border-radius: 8px;
`;

const Texts = styled.View`
  flex: 1;
`;

const CardTitle = styled.Text`
  ${({ theme }) => theme.fonts.titleSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Body = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const MessageBody = styled.Text`
  ${({ theme }) => theme.fonts.captionDense};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// 받은 시각 captionHero 11/17 (D04에서 디자이너 확인)
const Time = styled.Text<{ $top: number }>`
  position: absolute;
  top: ${({ $top }) => $top}px;
  right: 27px;
  ${({ theme }) => theme.fonts.captionHero};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default SummaryBlock;
