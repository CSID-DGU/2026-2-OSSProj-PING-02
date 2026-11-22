import { useCallback, useState } from "react";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { Button } from "@core/ui/button";
import AuthLayout from "@components/auth/AuthLayout";
import AuthIntro from "@components/auth/AuthIntro";
import LoadState from "@components/contact/LoadState";
import RadioCard from "@components/contact/RadioCard";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import { services } from "@services";
import type { AppParamList } from "@routes/types";
import * as s from "../contact/Contact_styled";

// 05 / 15 첫마디 제안: 다시 연락할 때 부담 없는 안부 한마디
// - "오래 연락 못 했다"는 사과·압박 대신 가벼운 안부 (후보 문장은 서비스에서)
// - 미리 골라 두지 않음 (09와 같음). 고른 뒤 10 답장 다듬기에서 고치고 복사해 메신저에서 보냄 (자동 전송 없음)
// TODO(디자이너 공유): 시안에 없는 "직접 쓰기" 버튼 추가 (09와 같은 구성)
const FirstWords = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "FirstWords">>();
  const { personId } = params;
  const [selected, setSelected] = useState<string>();

  const load = useCallback(
    () => services.friends.getFirstWords(personId),
    [personId]
  );
  const { state, retry } = useLoad(load);

  const writeMyself = () =>
    navigation.navigate("ReplyEdit", { personId, text: "" });

  if (state.status !== "ready") {
    return (
      <AuthLayout title="첫마디">
        <LoadState
          status={state.status}
          loadingLabel="첫마디를 준비하는 중"
          errorTitle="첫마디를 준비하지 못했어요"
          onRetry={retry}
        />
        {state.status === "error" && (
          <Button variant="secondary" fullWidth onPress={writeMyself}>
            직접 쓰기
          </Button>
        )}
      </AuthLayout>
    );
  }

  const options = state.data;

  return (
    <AuthLayout title="첫마디" gap={12} paddingBottom={32}>
      <AuthIntro
        title="짧은 안부부터 시작해볼까요?"
        description="과도하게 사과하지 않아도 진심은 전해질 수 있어요."
      />

      <s.Cards accessibilityRole="radiogroup">
        {options.map(text => (
          <RadioCard
            key={text}
            text={text}
            selected={selected === text}
            onSelect={() => setSelected(text)}
          />
        ))}
      </s.Cards>

      <s.Actions>
        <Button
          variant="primary"
          fullWidth
          disabled={!selected}
          accessibilityHint={selected ? undefined : "첫마디를 하나 고르면 누를 수 있어요"}
          onPress={() =>
            selected &&
            navigation.navigate("ReplyEdit", { personId, text: selected })
          }
        >
          선택한 첫마디 수정하기
        </Button>
        <Button variant="secondary" fullWidth onPress={writeMyself}>
          직접 쓰기
        </Button>
      </s.Actions>
    </AuthLayout>
  );
};

export default FirstWords;
