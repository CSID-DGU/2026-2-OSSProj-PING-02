import styled from "styled-components/native";
import { LINKED_APP_OPTIONS } from "@constants/onboarding";
import type { Account, FriendDetail, MessengerApp } from "@services";
import { AccountLine } from "./AccountLine";

// 06 친구 E03-1 상세 연결 계정 (720px ÷2)
// "연결된 계정"(titleSubsection 16/24) → 앱마다 한 줄(높이 80) → "연결이 필요한 계정" → 후보 줄 또는 안내
// - 앱 줄: 수집하는 앱(카카오톡·인스타그램·문자) 모두. 계정이 있으면 연결됨(문자는 "연락처 기반"), 없으면 "연결 안 됨"
//   같은 앱 계정이 여럿이면 계정마다 한 줄
// - 연결됨 줄 → 연결 관리 시트(E03-3/4), 연결 안 됨 줄 → 이 친구에게 계정 연결(E04-1 모양 시트)
// - 연결이 필요한 계정: 이름이 비슷한데 아직 친구와 연결되지 않은 계정 → 누르면 확인 팝업 후 연결
interface LinkedAccountsPanelProps {
  detail: FriendDetail;
  suggestions: Account[];
  onOpenAccount: (account: Account) => void;
  onLinkApp: (app: MessengerApp) => void;
  onSuggestion: (account: Account) => void;
}

const LinkedAccountsPanel = ({
  detail,
  suggestions,
  onOpenAccount,
  onLinkApp,
  onSuggestion,
}: LinkedAccountsPanelProps) => {
  const { person, accounts } = detail;
  return (
    <>
      <SectionTitle accessibilityRole="header">연결된 계정</SectionTitle>
      {LINKED_APP_OPTIONS.map(({ value: app }) => {
        const mine = accounts.filter(a => a.app === app);
        if (mine.length === 0) {
          return (
            <AccountLine
              key={app}
              app={app}
              status="unlinked"
              onPress={() => onLinkApp(app)}
              accessibilityHint="눌러서 이 친구의 계정을 연결해요"
            />
          );
        }
        return mine.map(account => (
          <AccountLine
            key={account.id}
            app={app}
            status={app === "SMS" ? "contact" : "linked"}
            // 문자는 번호로 구분 (연락처에 번호가 없으면 이름)
            subtitle={app === "SMS" ? person.phone ?? account.senderName : account.senderName}
            onPress={() => onOpenAccount(account)}
            accessibilityHint="눌러서 연결을 관리해요"
          />
        ));
      })}

      <SectionTitle accessibilityRole="header" $top={11}>
        연결이 필요한 계정
      </SectionTitle>
      {suggestions.length === 0 ? (
        <Empty>연결이 필요해보이는 계정을 찾지 못했어요.</Empty>
      ) : (
        // TODO(디자이너 공유): 후보가 있을 때 시안 없음 → 위 줄과 같은 모양(연결 안 됨 + 계정 이름)
        suggestions.map(account => (
          <AccountLine
            key={account.id}
            app={account.app}
            status="unlinked"
            subtitle={account.senderName}
            onPress={() => onSuggestion(account)}
            accessibilityHint="눌러서 이 친구의 계정으로 연결해요"
          />
        ))
      )}
    </>
  );
};

// 시안: 하위 탭 아래 약 22 · 왼쪽 30
const SectionTitle = styled.Text<{ $top?: number }>`
  margin-top: ${({ $top }) => $top ?? 22}px;
  padding: 0px 30px;
  ${({ theme }) => theme.fonts.titleSubsection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// TODO(Figma 스타일 확인): 약 12 → captionRegular 12/17
const Empty = styled.Text`
  margin-top: 21px;
  margin-bottom: 24px;
  text-align: center;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default LinkedAccountsPanel;
