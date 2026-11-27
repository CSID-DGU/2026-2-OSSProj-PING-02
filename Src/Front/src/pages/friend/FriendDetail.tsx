import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { Dialog } from "@core/ui/dialog";
import { UnderlineTabs } from "@core/ui/tabs";
import TabScreen from "@components/main/TabScreen";
import LoadState from "@components/contact/LoadState";
import FriendRow from "@components/friend/FriendRow";
import FriendSearchBar from "@components/friend/FriendSearchBar";
import FriendInfoForm from "@components/friend/FriendInfoForm";
import LinkedAccountsPanel from "@components/friend/LinkedAccountsPanel";
import RawMessagesPanel from "@components/friend/RawMessagesPanel";
import AccountSheet from "@components/friend/AccountSheet";
import ConnectFriendSheet from "@components/friend/ConnectFriendSheet";
import SameNamePopup from "@components/friend/SameNamePopup";
import { accountAppLabel } from "@components/friend/AccountLine";
import { APP_LABEL } from "@constants/contact";
import { FRIEND_TABS, type FriendTab } from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useFocusLoad } from "@hooks/useFocusLoad";
import {
  services,
  type Account,
  type FriendDetail as Detail,
  type FriendInfoPatch,
  type FriendSummary,
  type MessengerApp,
} from "@services";
import type { AppParamList } from "@routes/types";

// 06 친구 상세 (Figma "06 친구 최종" E02 · E03 · E03-1~4 · E04 · E04-1, 720px ÷2)
// 앱바("친구", 뒤로가기, 🔔) → 검색창 → 6개 탭 → 친구 줄 → 하위 탭(기본 정보 · 연결 계정 · 원문 관리)
// - 검색창·6개 탭은 목록으로 가는 길: 탭을 누르면 목록으로 돌아가 그 탭, 검색창을 누르면 목록 검색칸에 포커스
//   (6개 탭에는 이 친구가 속한 탭이 선택돼 보임: NEW · 관계 · 관계가 없으면 전체)
// - NEW(아직 친구로 등록 안 함): 하위 탭과 상관없이 E02 질문 + 버튼 3개 (팀 확정)
//   이름이 같은 친구가 있으면 처음 열 때 E04 팝업을 먼저 띄움
// - 친구: 기본 정보(자동 저장) · 연결 계정(연결 관리 시트) · 원문 관리
type SubTab = "info" | "accounts" | "raw";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "info", label: "기본 정보" },
  { key: "accounts", label: "연결 계정" },
  { key: "raw", label: "원문 관리" },
];

// E04-1 모양 시트를 여는 이유
type ConnectSheet =
  | { kind: "person" } // E02 "다른 친구에게 연결하기": 이 NEW를 친구에게 합침
  | { kind: "account"; account: Account } // 시트 "다른 친구에게 연결": 계정 하나를 친구에게 옮김
  | { kind: "app"; app: MessengerApp }; // "연결 안 됨" 앱 줄: 다른 NEW의 그 앱 계정을 이 친구에게

type Confirm =
  | { kind: "remove" }
  | { kind: "disconnect"; account: Account }
  | { kind: "suggestion"; account: Account };

const tabOf = ({ person }: Detail): FriendTab =>
  !person.isFriend ? "new" : person.relation ?? "all";

const FriendDetail = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "FriendDetail">>();
  const { personId } = params;
  const [subTab, setSubTab] = useState<SubTab>("info");
  const [connect, setConnect] = useState<ConnectSheet | null>(null);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [accountSheet, setAccountSheet] = useState<Account | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [sameName, setSameName] = useState<FriendSummary | null>(null);
  const [suggestions, setSuggestions] = useState<Account[]>([]);
  const busy = useRef(false);

  const load = useCallback(() => services.friends.get(personId), [personId]);
  const { state, retry, reload } = useFocusLoad(load);
  const detail = state.status === "ready" ? state.data : null;
  const isNew = detail ? !detail.person.isFriend : false;

  // E04: NEW를 처음 열 때 한 번만 확인
  const askedSameName = useRef(false);
  useEffect(() => {
    if (!detail || !isNew || askedSameName.current) return;
    askedSameName.current = true;
    services.friends
      .getSameNameFriend(personId)
      .then(setSameName)
      .catch(() => {});
  }, [detail, isNew, personId]);

  // E03-1 연결이 필요한 계정
  useEffect(() => {
    if (!detail || isNew) return;
    services.friends
      .getConnectSuggestions(personId)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, [detail, isNew, personId]);

  // 하나씩만 처리 (두 번 눌러도 한 번)
  const run = async (task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await task();
    } finally {
      busy.current = false;
    }
  };

  // 목록으로 (지금 친구 탭 스택이면 그 목록으로 돌아가고, 다른 탭이면 친구 탭으로)
  const goToList = (listParams: { tab?: FriendTab; focusSearch?: number }) => {
    const root = navigation.getState()?.routes[0]?.name;
    if (root === "FriendsMain") {
      navigation.popTo("FriendsMain", listParams);
    } else {
      navigation.navigate("Home", {
        screen: "friends",
        params: { screen: "FriendsMain", params: listParams },
      });
    }
  };

  // 이 친구가 다른 친구에 합쳐져 사라지면 그 친구 상세로 바꿔 끼움
  const openFriend = (id: string) => navigation.replace("FriendDetail", { personId: id });

  const openConnect = async (sheet: ConnectSheet) => {
    const all = await services.friends.list();
    setFriends(all);
    setConnect(sheet);
  };

  const connectItems = (): FriendSummary[] => {
    if (!connect) return [];
    if (connect.kind === "app") {
      return friends.filter(
        f =>
          f.person.id !== personId &&
          !f.person.isFriend &&
          f.accounts.some(a => a.app === connect.app)
      );
    }
    return friends.filter(f => f.person.id !== personId && f.person.isFriend);
  };

  const onConnectConfirm = (target: FriendSummary) =>
    run(async () => {
      if (!connect || !detail) return;
      setConnect(null);
      if (connect.kind === "person") {
        await services.friends.connectTo(personId, target.person.id);
        openFriend(target.person.id);
      } else if (connect.kind === "account") {
        const last = detail.accounts.length <= 1;
        await services.friends.mergeAccount(target.person.id, connect.account.id);
        if (last) openFriend(target.person.id);
        else await reload();
      } else {
        const account = target.accounts.find(a => a.app === connect.app);
        if (account) await services.friends.mergeAccount(personId, account.id);
        await reload();
      }
    });

  const onSameNameConnect = () =>
    run(async () => {
      if (!sameName) return;
      const target = sameName.person.id;
      setSameName(null);
      await services.friends.connectTo(personId, target);
      openFriend(target);
    });

  const onConfirm = () =>
    run(async () => {
      if (!confirm) return;
      const current = confirm;
      setConfirm(null);
      if (current.kind === "remove") {
        await services.friends.remove(personId);
        navigation.goBack();
      } else if (current.kind === "disconnect") {
        await services.friends.splitAccount(personId, current.account.id);
        await reload();
      } else {
        await services.friends.mergeAccount(personId, current.account.id);
        await reload();
      }
    });

  const saveInfo = (patch: FriendInfoPatch) =>
    services.friends.updateInfo(personId, patch);

  const setAnalysis = (accountIds: string[], on: boolean) =>
    run(async () => {
      await services.friends.setAnalysis(personId, accountIds, on);
      await reload();
    });

  const name = detail?.person.displayName ?? "";

  const body = (() => {
    if (!detail) return null;
    if (isNew) {
      return (
        <NewChoice>
          <Question accessibilityRole="header">
            {"기존 친구에게 연결하거나\n새로운 친구로 등록해볼까요?"}
          </Question>
          <NewActions>
            <Button fullWidth onPress={() => openConnect({ kind: "person" })}>
              다른 친구에게 연결하기
            </Button>
            <Button
              fullWidth
              onPress={() =>
                run(async () => {
                  await services.friends.addFriend(personId);
                  setSubTab("info");
                  await reload();
                })
              }
            >
              새 친구 추가하기
            </Button>
          </NewActions>
          {/* TODO(Figma 스타일 확인): 약 13 → bodySmall 13/19 */}
          <Button
            variant="text"
            typo="bodySmall"
            onPress={() => setConfirm({ kind: "remove" })}
          >
            연결하지 않고 삭제하기
          </Button>
        </NewChoice>
      );
    }
    if (subTab === "info") {
      return (
        <FriendInfoForm
          key={detail.person.id}
          detail={detail}
          onSave={saveInfo}
          onToggleAnalysis={on => setAnalysis(detail.accounts.map(a => a.id), on)}
        />
      );
    }
    if (subTab === "accounts") {
      return (
        <LinkedAccountsPanel
          detail={detail}
          suggestions={suggestions}
          onOpenAccount={setAccountSheet}
          onLinkApp={app => openConnect({ kind: "app", app })}
          onSuggestion={account => setConfirm({ kind: "suggestion", account })}
        />
      );
    }
    const conversationId = detail.lastConversation?.conversationId;
    return (
      <RawMessagesPanel
        stats={detail.rawStats}
        onOpenMessages={
          conversationId
            ? () => navigation.navigate("ConversationDetail", { conversationId })
            : undefined
        }
      />
    );
  })();

  const confirmText = (() => {
    if (!confirm) return null;
    if (confirm.kind === "remove") {
      return {
        title: "연결하지 않고 삭제할까요?",
        description: `‘${name}’을 목록에서 지워요. 다시 연락이 오면 NEW로 다시 보여 드릴게요.`,
        confirmLabel: "삭제하기",
      };
    }
    const { account } = confirm;
    const label = `${APP_LABEL[account.app]} ‘${account.senderName}’`;
    return confirm.kind === "disconnect"
      ? {
          title: "연결을 해지할까요?",
          description: `${label} 계정을 ${name}에게서 떼어 NEW로 옮겨요. 나중에 다시 연결할 수 있어요.`,
          confirmLabel: "연결 해지하기",
        }
      : {
          title: "이 친구의 계정으로 연결할까요?",
          description: `${label} 계정을 ${name}의 계정으로 함께 볼게요.`,
          confirmLabel: "연결하기",
        };
  })();

  const sheetAccount = accountSheet
    ? detail?.accounts.find(a => a.id === accountSheet.id) ?? null
    : null;

  return (
    <TabScreen
      title="친구"
      divider={false}
      background="surface"
      onBack={() => navigation.goBack()}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={scrollContent}>
        <Top testID="friend-detail-top">
          <FriendSearchBar onPress={() => goToList({ focusSearch: Date.now() })} />
          <Tabs>
            <UnderlineTabs
              tabs={FRIEND_TABS}
              value={detail ? tabOf(detail) : "all"}
              onChange={tab => goToList({ tab })}
            />
          </Tabs>
        </Top>

        {!detail ? (
          <LoadState
            status={state.status === "error" ? "error" : "loading"}
            loadingLabel="친구 정보를 불러오는 중"
            errorTitle="친구 정보를 불러오지 못했어요"
            onRetry={retry}
          />
        ) : (
          <>
            <RowSlot>
              <FriendRow item={detail} />
            </RowSlot>
            <SubTabs>
              <UnderlineTabs
                tabs={SUB_TABS}
                value={subTab}
                onChange={setSubTab}
                typo="labelRelationChip"
              />
            </SubTabs>
            {body}
          </>
        )}
      </ScrollView>

      <AccountSheet
        account={sheetAccount}
        phone={detail?.person.phone}
        analysisOn={!!sheetAccount && !detail?.analysisOff.includes(sheetAccount.id)}
        canDisconnect={(detail?.accounts.length ?? 0) > 1}
        onToggleAnalysis={on => sheetAccount && setAnalysis([sheetAccount.id], on)}
        onConnectOther={() => {
          if (!sheetAccount) return;
          setAccountSheet(null);
          openConnect({ kind: "account", account: sheetAccount });
        }}
        onDisconnect={() => {
          if (!sheetAccount) return;
          setAccountSheet(null);
          setConfirm({ kind: "disconnect", account: sheetAccount });
        }}
        onClose={() => setAccountSheet(null)}
      />

      <ConnectFriendSheet
        visible={!!connect}
        // TODO(Figma 문구 확인): "연결 안 됨" 앱 줄에서 여는 시트 제목은 시안 없음
        title={
          connect?.kind === "app"
            ? `${accountAppLabel(connect.app)} 계정 연결`
            : "기존 친구에게 연결"
        }
        items={connectItems()}
        onConfirm={onConnectConfirm}
        onClose={() => setConnect(null)}
      />

      <SameNamePopup
        visible={!!sameName}
        account={detail?.accounts[0]}
        friendName={sameName?.person.displayName ?? ""}
        onConnect={onSameNameConnect}
        onDifferent={() => {
          setSameName(null);
          services.friends.dismissSameName(personId).catch(() => {});
        }}
        onClose={() => setSameName(null)}
      />

      {confirmText && (
        <Dialog
          visible
          icon={null}
          title={confirmText.title}
          description={confirmText.description}
          confirmLabel={confirmText.confirmLabel}
          onConfirm={onConfirm}
          closeLabel="취소"
          onClose={() => setConfirm(null)}
        />
      )}
    </TabScreen>
  );
};

const scrollContent = { paddingBottom: 12 };

// 목록과 같은 자리: 앱바 아래 18 → 검색창 → 탭(양옆 16)
const Top = styled.View`
  padding-top: 18px;
`;

const Tabs = styled.View`
  padding: 0px 16px;
`;

// 탭 아래 12 → 친구 줄(72)
const RowSlot = styled.View`
  margin-top: 12px;
`;

// 친구 줄 아래 13 → 하위 탭
const SubTabs = styled.View`
  margin-top: 13px;
  padding: 0px 16px;
`;

// E02: 하위 탭 아래 약 49 → 질문 2줄(headingDialog 18/26) → 30 → 버튼 2개(사이 4, 양옆 16) → 텍스트 버튼
const NewChoice = styled.View`
  padding: 49px 16px 24px;
  align-items: center;
`;

const Question = styled.Text`
  ${({ theme }) => theme.fonts.headingDialog};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const NewActions = styled.View`
  align-self: stretch;
  gap: 4px;
  margin-top: 30px;
  margin-bottom: 6px;
`;

export default FriendDetail;
