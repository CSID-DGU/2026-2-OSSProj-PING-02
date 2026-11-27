import { useCallback, useRef, useState, type ComponentRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { Button } from "@core/ui/button";
import { TextArea } from "@core/ui/field";
import { useToast } from "@core/ui/toast";
import LoadState from "@components/contact/LoadState";
import LongMessageNotice from "@components/contact/LongMessageNotice";
import SeedProgress from "@components/contact/SeedProgress";
import SummaryBlock from "@components/contact/SummaryBlock";
import TabScreen from "@components/main/TabScreen";
import Notice from "@components/onboarding/Notice";
import { APP_LABEL } from "@constants/contact";
import { useAuthNavigation } from "@hooks/useAuthNavigation";
import { useLoad } from "@hooks/useLoad";
import { services, type TruncatedItem } from "@services";
import type { AppParamList } from "@routes/types";

// 05 연락 D04 긴 메시지 보완 (Figma "긴 메시지 보완(1)", "(2)_붙여넣기 전·후" ÷2)
// 알림에는 긴 메시지의 앞부분만 와서, 메신저에서 전체를 복사해 붙여 넣으면 기기 안에서 정리함
// 붙여 넣은 원문은 저장하지 않고, 서버로는 기기 안 규칙 마스킹으로 가린 내용만 보냄
// - 모든 대화(D01 안내·홈 빠른 기능): (1) 시작 화면 "보완 시작하기" → (2) 한 건씩
// - 한 대화(D03 안내): 그 대화의 잘린 메시지만, (2)부터 (팀 확정)
// - (2): 확인된 내용(잘린 앞부분) · 전체 내용 상자 · 붙여넣기 / 확인 완료
//   확인 완료 → 다음 씨앗이 색 있는 말씨앗으로 바뀌고 다음 잘린 메시지로 (디자이너 확인)
//   마지막까지 끝나면 토스트 + 들어온 화면으로 (시안 없음, 팀 확정)
// TODO(Figma 문구 확인): 시안에 없는 토스트 문구 (빈 클립보드·정리 실패·모두 보완)
// TODO(네이티브): 메신저 "공유하기"로 받기(공유 인텐트)
const MAX_LENGTH = 500;

const TruncatedMessage = () => {
  const navigation = useAuthNavigation();
  const { params } = useRoute<RouteProp<AppParamList, "TruncatedMessage">>();
  const conversationId = params?.conversationId;

  const load = useCallback(
    () => services.conversation.listTruncated(conversationId),
    [conversationId]
  );
  const { state, retry } = useLoad(load);

  return (
    <TabScreen
      title="긴 메시지 보완"
      onBack={() => navigation.goBack()}
      divider={false}
      background="surface"
    >
      {state.status === "ready" ? (
        <Flow items={state.data} startAtFirst={!!conversationId} />
      ) : (
        <LoadState
          status={state.status}
          loadingLabel="잘린 메시지를 불러오는 중"
          errorTitle="잘린 메시지를 불러오지 못했어요"
          onRetry={retry}
        />
      )}
    </TabScreen>
  );
};

interface FlowProps {
  // 들어올 때의 목록 그대로 진행 (보완해도 씨앗 개수는 그대로)
  items: TruncatedItem[];
  startAtFirst: boolean;
}

const Flow = ({ items, startAtFirst }: FlowProps) => {
  const navigation = useAuthNavigation();
  const toast = useToast();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // null = 시작 화면
  const [index, setIndex] = useState<number | null>(startAtFirst ? 0 : null);
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);

  const total = items.length;
  const item = index === null ? null : items[index];

  const paste = async () => {
    try {
      const clip = (await services.messenger.readClipboard()).trim();
      if (!clip) {
        toast.show("복사한 내용이 없어요. 메신저에서 먼저 복사해 주세요", {
          icon: "none",
        });
        return;
      }
      setText(clip.slice(0, MAX_LENGTH));
      toast.show("붙여넣기 성공!");
    } catch {
      toast.show("붙여넣지 못했어요. 다시 시도해 주세요", { icon: "none" });
    }
  };

  const confirm = async () => {
    if (!item || index === null) return;
    setWorking(true);
    try {
      await services.conversation.summarizePasted(
        item.conversation.id,
        text,
        item.message.id
      );
    } catch {
      setWorking(false);
      toast.show("정리하지 못했어요. 다시 시도해 주세요", { icon: "none" });
      return;
    }
    setWorking(false);
    if (index + 1 < total) {
      setIndex(index + 1);
      setText("");
      scroll.current?.scrollTo({ y: 0, animated: true });
    } else {
      toast.show("긴 메시지를 모두 보완했어요");
      navigation.goBack();
    }
  };

  const empty = !text.trim();
  const appName = item ? APP_LABEL[item.conversation.app] : "";

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Intro>
        <Title accessibilityRole="header">알림에서 내용이 잘렸어요</Title>
        <Description>보이는 일부만으로 답장을 만들지 않아요.</Description>
      </Intro>

      {total === 0 ? (
        // 시안 없음 (팀 확정): 홈 빠른 기능에서 들어왔는데 잘린 메시지가 없을 때
        <Block $top={12} $side={16}>
          <Notice align="center" title="지금은 보완할 메시지가 없어요" />
        </Block>
      ) : (
        <>
          <Block $top={5}>
            <LongMessageNotice
              title={
                index === null
                  ? `인식에 실패한 장문 메시지가 ${total}건 있어요`
                  : `인식에 실패한 장문 메시지 ${total}건 중 ${index + 1}번째 건을 보완해요`
              }
            />
          </Block>
          <Block $top={14}>
            <SeedProgress
              total={total}
              colored={index === null ? 0 : index + 1}
            />
          </Block>

          {item === null ? (
            <Actions $top={18}>
              <Button
                fullWidth
                typo="labelButtonCompact"
                onPress={() => setIndex(0)}
              >
                보완 시작하기
              </Button>
            </Actions>
          ) : (
            <>
              <Block $top={14}>
                <SummaryBlock
                  variant="message"
                  title="확인된 내용"
                  titleSize="section"
                  cardTitle={item.message.senderName}
                  body={`${item.message.text}…`}
                  app={item.conversation.app}
                  receivedAt={item.message.receivedAt}
                  messages={[]}
                />
              </Block>

              <SectionTitle accessibilityRole="header">
                전체 내용 가져오기
              </SectionTitle>
              <Guide>메신저에서 내용 복사해서 붙여넣어 주세요.</Guide>
              <Block $top={11} $side={16}>
                {/* TODO(Figma 스타일 확인): 붙여 넣은 글자는 TextArea 기본 captionRegular 12/17 */}
                <TextArea
                  label="전체 내용"
                  accessibilityLabel="전체 내용"
                  value={text}
                  onChangeText={setText}
                  maxLength={MAX_LENGTH}
                  minHeight={116}
                  editable={!working}
                />
              </Block>

              <Actions $top={10}>
                <Button
                  fullWidth
                  typo="labelButtonCompact"
                  disabled={working}
                  onPress={paste}
                >
                  붙여넣기
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  typo="labelButtonCompact"
                  disabled={empty || working}
                  accessibilityState={{ busy: working, disabled: empty || working }}
                  accessibilityHint={
                    empty ? "전체 내용을 붙여 넣으면 누를 수 있어요" : undefined
                  }
                  onPress={confirm}
                >
                  {working ? "정리하는 중…" : "확인 완료"}
                </Button>
              </Actions>
              {/* Figma와 다르게 간 부분(팀 확정): 그 대화방을 바로 여는 기능(#72)이라 작은 텍스트 버튼으로 남김 */}
              <Block $top={4}>
                <Button
                  variant="text"
                  onPress={() =>
                    // 가능하면 그 대화방을 바로 열어 전체 메시지를 복사하기 쉽게 (#69)
                    services.messenger
                      .openApp(item.conversation.app, item.conversation.id)
                      .catch(() => {})
                  }
                >
                  {`${appName} 열어서 복사하기`}
                </Button>
              </Block>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({ content: { paddingBottom: 24 } });

// 시안: 제목 왼쪽 16 · 앱바 바로 아래
const Intro = styled.View`
  gap: 2px;
  padding: 3px 16px 0px;
`;

const Title = styled.Text`
  ${({ theme }) => theme.fonts.titleSubsection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.Text`
  ${({ theme }) => theme.fonts.bodyCompact};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Block = styled.View<{ $top: number; $side?: number }>`
  margin-top: ${({ $top }) => $top}px;
  padding: 0px ${({ $side }) => $side ?? 0}px;
`;

const SectionTitle = styled.Text`
  margin-top: 20px;
  padding-left: 26px;
  ${({ theme }) => theme.fonts.titleHomeSection};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Guide = styled.Text`
  margin-top: 7px;
  padding-left: 34px;
  ${({ theme }) => theme.fonts.captionRegular};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Actions = styled.View<{ $top: number }>`
  gap: 5px;
  margin-top: ${({ $top }) => $top}px;
  padding: 0px 20px;
`;

export default TruncatedMessage;
