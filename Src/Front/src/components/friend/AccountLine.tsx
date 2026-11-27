import styled, { useTheme } from "styled-components/native";
import { ChevronRightIcon } from "@core/ui/icon";
import { APP_LABEL } from "@constants/contact";
import { FRIEND_APP_ICON } from "@constants/friend";
import type { MessengerApp } from "@services";

// 06 친구 E03-1 연결 계정 줄 · E03-3/4 시트 계정 카드에서 같이 쓰는 앱 로고·상태 칩

// 연결 계정 탭 줄의 앱 이름 (시안: 문자 메신저 → "문자")
export const accountAppLabel = (app: MessengerApp) =>
  app === "SMS" ? "문자" : APP_LABEL[app];

// 연결 관리 시트 제목·스위치 문구 (팀 확정)
export const accountSheetText = (app: MessengerApp) =>
  app === "SMS"
    ? {
        title: "문자 메신저 연결 관리",
        analysis: "이 번호의 연락 분석",
        analysisDescription: "이 번호로 오는 알림을 분석해요",
      }
    : {
        title: `${APP_LABEL[app]} 연결 관리`,
        analysis: "이 계정의 연락 분석",
        analysisDescription: "이 계정에서 오는 알림을 분석해요",
      };

export type AccountStatus = "linked" | "unlinked" | "contact";

const STATUS_LABEL: Record<AccountStatus, string> = {
  linked: "연결됨",
  unlinked: "연결 안 됨",
  contact: "연락처 기반",
};

// 상태 칩 (시안 높이 약 26 · 글자 11)
// TODO(디자이너 공유): 시안 색이 토큰에 없어 가까운 토큰으로
//   연결됨 ≈#EEF5EA/#6B9A5B → feedbackSuccessBg/Text (#44에서 정함)
//   연결 안 됨 ≈#F0EFEE/#2B2724 → backgroundSubtle/textPrimary
//   연락처 기반 ≈#F6EFEB/#655A53 → surfaceBrown/textSecondary
export const StatusChip = ({ status }: { status: AccountStatus }) => (
  <Chip $status={status}>
    <ChipText $status={status}>{STATUS_LABEL[status]}</ChipText>
  </Chip>
);

export const statusLabel = (status: AccountStatus) => STATUS_LABEL[status];

// 앱 로고 (시안 36, 모서리는 이미지에 포함)
export const AppLogo = ({ app }: { app: MessengerApp }) => (
  <Logo source={FRIEND_APP_ICON[app]} accessible={false} />
);

// E03-1 한 줄: 로고 36 → 14 → 앱 이름 + 칩 / 아래 계정 이름·번호 → ">"
interface AccountLineProps {
  app: MessengerApp;
  status: AccountStatus;
  subtitle?: string;
  onPress: () => void;
  accessibilityHint?: string;
}

export const AccountLine = ({
  app,
  status,
  subtitle,
  onPress,
  accessibilityHint,
}: AccountLineProps) => {
  const theme = useTheme();
  const name = accountAppLabel(app);
  return (
    <Line
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, STATUS_LABEL[status], subtitle]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint={accessibilityHint}
    >
      <AppLogo app={app} />
      <Texts>
        <Top>
          <AppName>{name}</AppName>
          <StatusChip status={status} />
        </Top>
        {subtitle ? <Subtitle numberOfLines={1}>{subtitle}</Subtitle> : null}
      </Texts>
      <ChevronRightIcon size={21} color={theme.colors.iconSubtle} />
    </Line>
  );
};

const Line = styled.Pressable`
  min-height: 79px;
  flex-direction: row;
  align-items: center;
  padding: 0px 33px 0px 35px;
`;

const Logo = styled.Image`
  width: 36px;
  height: 36px;
`;

const Texts = styled.View`
  flex: 1;
  margin-left: 14px;
  gap: 3px;
`;

const Top = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

// TODO(Figma 스타일 확인): 앱 이름 약 14 Bold → titleCard 14/20
const AppName = styled.Text`
  ${({ theme }) => theme.fonts.titleCard};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// TODO(Figma 스타일 확인): 계정 이름·번호 약 12 → captionRegular 12/17
const Subtitle = styled.Text`
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Chip = styled.View<{ $status: AccountStatus }>`
  height: 26px;
  padding: 0px 9px;
  border-radius: 13px;
  justify-content: center;
  background-color: ${({ theme, $status }) =>
    $status === "linked"
      ? theme.colors.feedbackSuccessBg
      : $status === "unlinked"
      ? theme.colors.backgroundSubtle
      : theme.colors.surfaceBrown};
`;

// TODO(Figma 스타일 확인): 칩 글자 약 10 → captionXSmall 10/14
const ChipText = styled.Text<{ $status: AccountStatus }>`
  ${({ theme }) => theme.fonts.captionXSmall};
  color: ${({ theme, $status }) =>
    $status === "linked"
      ? theme.colors.feedbackSuccessText
      : $status === "unlinked"
      ? theme.colors.textPrimary
      : theme.colors.textSecondary};
`;
