import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { Input } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL, replyStepFor } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import { services } from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "./Contact_styled";

// 08 "메시지가 잘린 상태 보기" (Figma 05 친구 Screens / 16 긴 메시지 붙여넣기)
// 알림에는 긴 메시지의 앞부분만 와서, 메신저에서 전체를 복사해 붙여 넣으면 기기 안에서 정리함
// 붙여 넣은 원문은 저장하지 않고, 서버로는 기기 안 규칙 마스킹으로 가린 내용만 보냄
// "요약하고 답장 찾기": 정리한 뒤 09 답장 후보로 이동 (돌아오면 정리한 내용을 보여 줌)
// TODO(디자이너 공유): 시안에 없는 "{앱} 열기" 텍스트 버튼 추가 (전체 내용을 복사하러 가는 길)
// TODO(네이티브): 메신저 "공유하기"로 받기(공유 인텐트), 클립보드 붙여넣기 버튼
type SummaryState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; summary: string }
  | { status: "error" };

const TruncatedMessage = () => {
  const navigation = useAuthNavigation();
  const { params } =
    useRoute<RouteProp<AppParamList, "TruncatedMessage">>();
  const { conversationId } = params;
  const [pasted, setPasted] = useState("");
  const [summary, setSummary] = useState<SummaryState>({ status: "idle" });

  const load = useCallback(
    () => services.conversation.get(conversationId),
    [conversationId]
  );
  const { state, retry } = useLoad(load);

  if (state.status !== "ready") {
    return (
      <AuthLayout title="잘린 메시지">
        <LoadState status={state.status} onRetry={retry} />
      </AuthLayout>
    );
  }

  const { conversation } = state.data;
  const appName = APP_LABEL[conversation.app];
  const working = summary.status === "working";
  const disabled = !pasted.trim() || working;

  const handleSummarize = async () => {
    setSummary({ status: "working" });
    try {
      const result = await services.conversation.summarizePasted(
        conversationId,
        pasted
      );
      setSummary({ status: "done", summary: result });
      // 붙여 넣은 전체 내용으로 AI가 결정 여부를 다시 판단했으니, 새 분석으로 답장 화면 갈래를 정함
      const { analysis } = await services.conversation.get(conversationId);
      navigation.navigate(replyStepFor(analysis.tags), { conversationId });
    } catch {
      setSummary({ status: "error" });
    }
  };

  return (
    <AuthLayout title="잘린 메시지" gap={12} paddingBottom={32}>
      <AuthIntro
        title="긴 메시지를 붙여넣어 주세요"
        description="알림에서 잘린 내용은 직접 공유하거나 붙여넣을 수 있어요."
      />

      <Input
        value={pasted}
        onChangeText={text => {
          setPasted(text);
          if (!working) setSummary({ status: "idle" });
        }}
        placeholder="메시지 내용을 여기에 붙여넣기"
        multiline
        textAlignVertical="top"
        accessibilityLabel="붙여넣을 메시지"
        style={styles.editor}
        editable={!working}
      />
      <Button
        variant="text"
        onPress={() =>
          // 가능하면 그 대화방을 바로 열어 전체 메시지를 복사하기 쉽게 (#69)
          services.messenger
            .openApp(conversation.app, conversationId)
            .catch(() => {})
        }
      >
        {`${appName} 열어서 복사하기`}
      </Button>

      {/* 시안: 흰 바탕 + 테두리 상자 → 공통 Card(default) */}
      <Card>
        <s.BlockBody>분석할 내용만 사용하고 원문은 저장하지 않아요.</s.BlockBody>
      </Card>

      {summary.status === "done" && (
        <Card accessibilityLiveRegion="polite">
          <s.BlockTitle>정리한 내용</s.BlockTitle>
          <s.BlockBody>{summary.summary}</s.BlockBody>
        </Card>
      )}
      {summary.status === "error" && (
        <Notice
          tone="danger"
          title="정리하지 못했어요. 내용을 확인하고 다시 해 주세요."
        />
      )}

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={disabled}
          accessibilityState={{ busy: working, disabled }}
          accessibilityHint={
            pasted.trim() ? undefined : "메시지를 붙여 넣으면 누를 수 있어요"
          }
          onPress={handleSummarize}
        >
          {working ? "정리하는 중…" : "요약하고 답장 찾기"}
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  // Figma 16 큰 입력 상자 약 220dp
  editor: { height: 220, paddingTop: 12 },
});

export default TruncatedMessage;
