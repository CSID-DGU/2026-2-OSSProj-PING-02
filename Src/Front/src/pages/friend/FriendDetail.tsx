import { useCallback, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { Dialog } from "@core/ui/dialog";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import RadioCard from "@components/contact/RadioCard";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL, withWa } from "@constants/contact";
import { formatBirthday, formatSince } from "@constants/friend";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useFocusLoad } from "@hooks/useFocusLoad";
import { services, type Account } from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "../contact/Contact_styled";

// 05 / 14 친구 상세 (Figma: 관계 메모 · 마지막 대화 · 생일 · 첫마디 함께 찾기)
// 시안에 없는 부분 (TODO(디자이너 공유)):
// - 앱바 "Label" 자리는 화면 이름("친구")
// - 첫마디 버튼 아래 "연결된 계정" 카드: 앱별 계정을 같은 사람으로 합치기·따로 보기 (둘 다 확인 팝업)
// - 얼려두기 / 다시 꺼내기 텍스트 버튼
// TODO(디자이너 공유): 관계 메모·생일 편집 화면 (지금은 보기만)
type Confirm =
  | { kind: "split"; account: Account }
  | { kind: "merge"; account: Account; ownerName: string | null; mergesOwner: boolean };

// 합치기 확인 문구. 다른 친구가 통째로 합쳐지면 그 친구가 사라진다는 것과 메모는 남는다는 것을 알림
const mergeDescription = (
  { account, ownerName, mergesOwner }: Extract<Confirm, { kind: "merge" }>,
  name: string
) => {
  const base = `${APP_LABEL[account.app]} ‘${account.senderName}’ 계정을 ${name}의 계정으로 함께 볼게요.`;
  const owner =
    mergesOwner && ownerName
      ? ` ‘${ownerName}’ 친구는 ${name}에 합쳐지고, 메모는 합쳐서 남겨요.`
      : "";
  return `${base}${owner} 나중에 다시 따로 볼 수 있어요.`;
};

const FriendDetail = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "FriendDetail">>();
  const { personId } = params;

  const load = useCallback(async () => {
    const [detail, candidates] = await Promise.all([
      services.friends.get(personId),
      services.friends.getMergeCandidates(personId),
    ]);
    return { detail, candidates };
  }, [personId]);
  const { state, retry, reload } = useFocusLoad(load);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePick, setMergePick] = useState<string>();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="친구">
        <LoadState
          status={state.status}
          loadingLabel="친구 정보를 불러오는 중"
          errorTitle="친구 정보를 불러오지 못했어요"
          onRetry={retry}
        />
      </AuthLayout>
    );
  }

  const { detail, candidates } = state.data;
  const { person, accounts, lastContactAt, lastConversation } = detail;
  const name = person.displayName;
  const picked = candidates.find(c => c.account.id === mergePick);

  // 합치기·분리·얼려두기 공통: 실패하면 안내만, 성공하면 다시 불러옴
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(false);
    try {
      await action();
      setMergeOpen(false);
      setMergePick(undefined);
      await reload();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const { kind, account } = confirm;
    setConfirm(null);
    run(() =>
      kind === "split"
        ? services.friends.splitAccount(personId, account.id)
        : services.friends.mergeAccount(personId, account.id)
    );
  };

  const lastText = lastConversation
    ? `${formatSince(lastConversation.at)} · ${lastConversation.topic}`
    : lastContactAt
    ? `${formatSince(lastContactAt)} · 여기에 모인 대화는 아직 없어요`
    : "아직 모인 대화가 없어요";

  return (
    <AuthLayout title="친구" gap={12} paddingBottom={32}>
      <AuthIntro
        title={name}
        description="관계 기록은 평가가 아니라 다시 시작하기 위한 메모예요."
      />

      {person.frozen && (
        <Notice title="얼려둔 관계예요">
          <s.Muted>
            목록 아래쪽에 조용히 두었어요. 마음이 내킬 때 언제든 다시 꺼내도
            괜찮아요.
          </s.Muted>
          <Button
            variant="text"
            disabled={busy}
            onPress={() => run(() => services.friends.setFrozen(personId, false))}
          >
            다시 꺼내기
          </Button>
        </Notice>
      )}

      <s.Cards>
        <Card>
          <s.BlockTitle>관계 메모</s.BlockTitle>
          <s.BlockBody>{person.memo ?? "아직 남긴 메모가 없어요."}</s.BlockBody>
        </Card>

        <Card
          onPress={
            lastConversation
              ? () =>
                  navigation.navigate("ConversationDetail", {
                    conversationId: lastConversation.conversationId,
                  })
              : undefined
          }
          accessibilityLabel={`마지막 대화. ${lastText}`}
          accessibilityHint={lastConversation ? "눌러서 연락을 봐요" : undefined}
        >
          <s.BlockTitle>마지막 대화</s.BlockTitle>
          <s.BlockBody numberOfLines={2}>{lastText}</s.BlockBody>
        </Card>

        {person.birthday && (
          <Card>
            <s.BlockTitle>{`생일: ${formatBirthday(person.birthday)}`}</s.BlockTitle>
          </Card>
        )}
      </s.Cards>

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate("FirstWords", { personId })}
        >
          첫마디 함께 찾기
        </Button>
      </s.Actions>

      {/* 시안 없음: 앱별 계정 합치기·따로 보기 */}
      <Card>
        <s.BlockTitle>연결된 계정</s.BlockTitle>
        <s.Muted>같은 사람의 앱별 계정을 한 친구로 모아 보여 드려요.</s.Muted>
        <s.Cards>
          {accounts.map(account => (
            <s.AccountRow key={account.id}>
              <s.AccountName numberOfLines={1}>
                {`${APP_LABEL[account.app]} · ${account.senderName}`}
              </s.AccountName>
              {accounts.length > 1 && (
                <Button
                  variant="text"
                  disabled={busy}
                  accessibilityLabel={`${account.senderName} 계정 따로 보기`}
                  onPress={() => setConfirm({ kind: "split", account })}
                >
                  따로 보기
                </Button>
              )}
            </s.AccountRow>
          ))}
        </s.Cards>

        {candidates.length > 0 && !mergeOpen && (
          <Button
            variant="text"
            disabled={busy}
            onPress={() => setMergeOpen(true)}
          >
            같은 사람의 다른 계정 합치기
          </Button>
        )}
      </Card>

      {mergeOpen && (
        <>
          <s.BlockTitle>{`${withWa(name)} 같은 사람인 계정을 골라 주세요`}</s.BlockTitle>
          <s.Cards accessibilityRole="radiogroup">
            {candidates.map(c => (
              <RadioCard
                key={c.account.id}
                label={APP_LABEL[c.account.app]}
                text={
                  c.ownerName
                    ? `${c.account.senderName} (지금은 ‘${c.ownerName}’으로 보고 있어요)`
                    : `${c.account.senderName} (아직 친구와 연결되지 않았어요)`
                }
                selected={mergePick === c.account.id}
                onSelect={() => setMergePick(c.account.id)}
              />
            ))}
          </s.Cards>
          <s.Actions>
            <Button
              variant="secondary"
              fullWidth
              disabled={!picked || busy}
              accessibilityHint={picked ? undefined : "계정을 하나 고르면 누를 수 있어요"}
              onPress={() =>
                picked &&
                setConfirm({
                  kind: "merge",
                  account: picked.account,
                  ownerName: picked.ownerName,
                  mergesOwner: picked.mergesOwner,
                })
              }
            >
              고른 계정 합치기
            </Button>
            <Button
              variant="text"
              onPress={() => {
                setMergeOpen(false);
                setMergePick(undefined);
              }}
            >
              합치지 않을게요
            </Button>
          </s.Actions>
        </>
      )}

      {actionError && (
        <Notice tone="danger" title="잠시 문제가 생겼어요. 조금 뒤에 다시 해 주세요." />
      )}

      {!person.frozen && (
        <s.Actions>
          <Button
            variant="text"
            disabled={busy}
            onPress={() => run(() => services.friends.setFrozen(personId, true))}
          >
            잠시 얼려두기
          </Button>
          <s.Hint>얼려두면 목록 아래쪽에 조용히 둘게요. 언제든 다시 꺼낼 수 있어요.</s.Hint>
        </s.Actions>
      )}

      <Dialog
        visible={!!confirm}
        icon={null}
        title={confirm?.kind === "split" ? "이 계정을 따로 볼까요?" : "같은 사람으로 합칠까요?"}
        description={
          confirm
            ? confirm.kind === "split"
              ? `${APP_LABEL[confirm.account.app]} ‘${confirm.account.senderName}’ 계정을 ${withWa(name)} 다른 사람으로 볼게요. 주고받은 대화는 지워지지 않아요.`
              : mergeDescription(confirm, name)
            : undefined
        }
        confirmLabel={confirm?.kind === "split" ? "따로 보기" : "합치기"}
        onConfirm={handleConfirm}
        closeLabel="그대로 둘게요"
        onClose={() => setConfirm(null)}
      />
    </AuthLayout>
  );
};

export default FriendDetail;
