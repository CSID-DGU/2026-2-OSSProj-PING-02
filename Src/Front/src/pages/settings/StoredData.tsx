import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { Dialog } from "@core/ui/dialog";
import { useToast } from "@core/ui/toast";
import { DataDetail, DataRow } from "@components/settings/DataSection";
import SettingsLayout from "@components/settings/SettingsLayout";
import { formatDotDate, STORED_DATA_COPY as C } from "@constants/settings";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { services, type RetentionInfo } from "@services";

// 08 설정 H07 저장된 데이터 (Figma "H07 / 저장된 데이터" 534:23413, 접힘 527:19962, 삭제 534:23592·534:23960, 완료 537:24120·537:24233)
// - 친구별 원문 캐시 >: 친구 탭으로 (친구 상세에서 한 명씩 관리. 별도 화면은 #77·#79 머지 후)
// - 수집 원문 전체 캐시: 30일마다 전체 삭제(첫 주기는 가입일부터), 지금 바로 삭제하면 그때부터 다시 셈
// - 요약·답장 기록: 기기에 저장된 AI 요약·답장 결과 (연락 상태 "답장함·확인함"은 그대로)
type Popup = "none" | "raw" | "ai";

interface AiStats {
  summaries: number;
  replies: number;
}

const StoredData = () => {
  const navigation = useAuthNavigation();
  const toast = useToast();
  const [raw, setRaw] = useState<RetentionInfo | null>(null);
  const [ai, setAi] = useState<AiStats | null>(null);
  const [open, setOpen] = useState({ raw: false, ai: false });
  const [popup, setPopup] = useState<Popup>("none");

  const load = useCallback(() => {
    services.rawMessages.getInfo().then(setRaw, () => setRaw(null));
    services.aiReplies.stats().then(setAi, () => setAi(null));
  }, []);

  // 화면에 올 때마다 다시 읽음 (다른 화면에서 원문·AI 결과가 늘었을 수 있음)
  useFocusEffect(load);

  const aiTotal = ai ? ai.summaries + ai.replies : 0;

  const deleteRaw = async () => {
    setPopup("none");
    try {
      const deleted = await services.rawMessages.deleteAllNow();
      toast.show(C.rawDeleted(deleted));
    } catch {
      toast.show(C.deleteFailed, { icon: "error" });
    }
    load();
  };

  const deleteAi = async () => {
    setPopup("none");
    try {
      const deleted = await services.aiReplies.clearAll();
      toast.show(C.aiDeleted(deleted));
    } catch {
      toast.show(C.deleteFailed, { icon: "error" });
    }
    load();
  };

  return (
    <SettingsLayout title={C.title} gap={4}>
      <DataRow
        title={C.friendCache}
        description={C.friendCacheDescription}
        chevron="right"
        onPress={() => navigation.navigate("Home", { screen: "friends" })}
      />

      <DataRow
        title={C.rawCache}
        description={
          raw
            ? open.raw
              ? C.count(raw.count)
              : C.rawSubtitleCollapsed(raw.count, raw.nextFullDeleteAt)
            : undefined
        }
        chevron={open.raw ? "up" : "down"}
        expanded={open.raw}
        onPress={() => setOpen((o) => ({ ...o, raw: !o.raw }))}
      />
      {open.raw && raw && (
        <DataDetail
          rows={[
            { label: C.rawCount, value: C.count(raw.count) },
            {
              label: C.lastDelete,
              value:
                raw.lastFullDeleteAt === null
                  ? C.noDate
                  : formatDotDate(raw.lastFullDeleteAt),
            },
            { label: C.nextDelete, value: formatDotDate(raw.nextFullDeleteAt) },
          ]}
          actionLabel={C.rawDeleteButton(raw.count)}
          actionDisabled={raw.count === 0}
          onAction={() => setPopup("raw")}
        />
      )}

      <DataRow
        title={C.aiRecords}
        description={ai ? C.count(aiTotal) : undefined}
        chevron={open.ai ? "up" : "down"}
        expanded={open.ai}
        onPress={() => setOpen((o) => ({ ...o, ai: !o.ai }))}
      />
      {open.ai && ai && (
        <DataDetail
          rows={[
            { label: C.summaryCount, value: C.count(ai.summaries) },
            { label: C.replyCount, value: C.count(ai.replies) },
          ]}
          actionLabel={C.aiDeleteButton(aiTotal)}
          actionDisabled={aiTotal === 0}
          onAction={() => setPopup("ai")}
        />
      )}

      {/* H07 / 수집 원문 전체 캐시 삭제 */}
      <Dialog
        visible={popup === "raw" && !!raw}
        icon={null}
        showCloseIcon
        title={raw ? C.rawDeleteTitle(raw.count) : ""}
        confirmLabel={C.cancel}
        onConfirm={() => setPopup("none")}
        closeLabel={raw ? C.deleteAll(raw.count) : ""}
        closeVariant="danger"
        onClose={deleteRaw}
        onDismiss={() => setPopup("none")}
      >
        <Body>{C.rawDeleteBody}</Body>
        {raw && <Note>{C.rawDeleteNote(raw.nextFullDeleteAt)}</Note>}
      </Dialog>

      {/* H07 / 요약+답장 기록 삭제 */}
      <Dialog
        visible={popup === "ai"}
        icon={null}
        showCloseIcon
        title={C.aiDeleteTitle(aiTotal)}
        confirmLabel={C.cancel}
        onConfirm={() => setPopup("none")}
        closeLabel={C.deleteAll(aiTotal)}
        closeVariant="danger"
        onClose={deleteAi}
        onDismiss={() => setPopup("none")}
      >
        <Body>{C.aiDeleteBody}</Body>
      </Dialog>
    </SettingsLayout>
  );
};

const Body = styled.Text`
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

// 시안: 높이 36 줄 가운데 (Label/Form)
const Note = styled.Text`
  padding: 9px 0px;
  ${({ theme }) => theme.fonts.labelForm};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

export default StoredData;
