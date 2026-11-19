import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import { Card } from "@core/ui/card";
import { Field, Input } from "@core/ui/field";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL } from "@constants/contact";
import { useLoad } from "@hooks/useLoad";
import { services } from "@services";
import type { RootStackParamList } from "@routes/router";
import * as s from "./Contact_styled";

// 08 "메시지가 잘린 상태 보기" (시안 없음 → 안내 상자 + 입력창 + 텍스트 버튼)
// 알림에는 긴 메시지의 앞부분만 와서, 메신저에서 전체를 복사해 붙여 넣으면 기기 안에서 정리함
// 붙여 넣은 원문은 서버로 보내지 않음 (가리기 모델 → 요약)
// TODO(디자이너 공유): 화면 시안 필요
// TODO(네이티브): 클립보드 읽기 버튼 (@react-native-clipboard/clipboard 설치 후)
type SummaryState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; summary: string }
  | { status: "error" };

const TruncatedMessage = () => {
  const { params } =
    useRoute<RouteProp<RootStackParamList, "TruncatedMessage">>();
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

  const { conversation, messages } = state.data;
  const appName = APP_LABEL[conversation.app];
  const cut = messages.filter(m => m.truncated);

  const handleSummarize = async () => {
    setSummary({ status: "working" });
    try {
      const result = await services.conversation.summarizePasted(
        conversationId,
        pasted
      );
      setSummary({ status: "done", summary: result });
    } catch {
      setSummary({ status: "error" });
    }
  };

  return (
    <AuthLayout title="잘린 메시지" gap={12} paddingBottom={32}>
      <AuthIntro
        title="메시지가 길어서 앞부분만 왔어요"
        description={`${appName}에서 전체 내용을 복사해 붙여 넣으면 기기 안에서 정리해 드려요.`}
      />

      <Card>
        <s.BlockTitle>알림으로 받은 부분</s.BlockTitle>
        {cut.map(m => (
          <s.BlockBody key={m.id}>{`${m.text}…`}</s.BlockBody>
        ))}
      </Card>

      <Notice title="붙여 넣은 내용은 기기 밖으로 나가지 않아요">
        <s.Muted>이름·전화번호 같은 내용은 먼저 가린 뒤에 정리해요.</s.Muted>
        <Button
          variant="text"
          onPress={() =>
            services.messenger.openApp(conversation.app).catch(() => {})
          }
        >
          {`${appName} 열기`}
        </Button>
      </Notice>

      <Field label="전체 메시지">
        <Input
          value={pasted}
          onChangeText={text => {
            setPasted(text);
            if (summary.status !== "working") setSummary({ status: "idle" });
          }}
          placeholder="여기에 붙여 넣어 주세요"
          multiline
          textAlignVertical="top"
          accessibilityLabel="전체 메시지"
          style={styles.editor}
        />
      </Field>

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
          disabled={!pasted.trim() || summary.status === "working"}
          accessibilityState={{
            busy: summary.status === "working",
            disabled: !pasted.trim() || summary.status === "working",
          }}
          onPress={handleSummarize}
        >
          {summary.status === "working"
            ? "정리하는 중…"
            : "기기 안에서 정리하기"}
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  editor: { height: 150, paddingTop: 12 },
});

export default TruncatedMessage;
