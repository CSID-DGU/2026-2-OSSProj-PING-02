import { maskPii, unmaskPii, type MaskResult } from "../../utils/masking";
import { NETWORK_ERROR, ServiceError } from "../common";
import type { NetworkService } from "../network/NetworkService";
import {
  AI_MAX_INPUT_CHARS,
  type AiReplyService,
  type Relation,
} from "./AiReplyService";
import type { AiReplyStore, SavedAiReply } from "./AiReplyStore";
import {
  classifyNeedsDecision,
  classifyRelation,
  looksLikeInstitution,
} from "./classifyMessage";

// 답장 후보 만들기 전체 흐름 (Doc/AI_답장_API_명세.md 6장)
//   1. 관계·결정 여부를 규칙으로 정함 (기기 안, 원문 기준)
//   2. 원문을 maskPii로 가림 → mapping은 이 함수 안에서만 쓰고 버림
//   3. 가린 문장만 서버(POST /v1/ai/reply)로 보냄
//   4. 요약·답장의 자리표시를 unmaskPii로 되돌림
//   5. 되돌린 결과를 기기에만 저장
// 오류는 ServiceError로 그대로 올려 보냄. 자동 재시도는 하지 않음 (사용자가 "다시"를 누를 때만)

export interface ConversationMessage {
  /** 알림의 보낸 사람 표시 이름 */
  sender: string;
  text: string;
  /** 내가 보낸 메시지면 true (관계·결정 판단에서 뺌) */
  fromMe?: boolean;
}

export interface AiReplyInput {
  conversationId: string;
  /** 대화의 최근 메시지 (오래된 것 → 최근). 길면 오래된 것부터 잘림 */
  messages: ConversationMessage[];
  /** 가릴 이름: 사용자 본인·친구 이름·별명·아이디. 메시지의 보낸 사람 이름은 자동으로 더함 */
  names: string[];
  /** 친구 설정 등으로 정해 둔 관계. 없으면 규칙으로 정함 */
  relation?: Relation;
  /** 사용자가 직접 고른 경우만. 없으면 규칙으로 정함 */
  needsDecision?: boolean;
}

export interface AiReplyDeps {
  ai: AiReplyService;
  store: AiReplyStore;
  network?: NetworkService;
  now?: () => number;
  createId?: () => string;
}

const defaultId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toLine = (m: ConversationMessage) => `${m.sender}: ${m.text}`;

/**
 * 메시지를 "보낸 사람: 내용" 줄로 이어 붙여 가린다. 가린 결과가 서버 상한을 넘으면
 * 오래된 메시지부터 빼고, 한 개만 남았는데도 길면 그 메시지의 앞부분을 잘라 다시 가린다.
 * (가린 뒤 문자열을 자르면 자리표시가 반쯤 잘려 되돌릴 수 없어서, 항상 원문을 줄이고 다시 가림)
 */
export function maskConversation(
  messages: ConversationMessage[],
  names: string[],
  limit = AI_MAX_INPUT_CHARS
): MaskResult {
  let kept = messages.filter((m) => m.text.trim().length > 0);
  if (kept.length === 0) {
    throw new ServiceError("EMPTY_MESSAGE", "답장할 메시지가 없어요");
  }
  for (;;) {
    const masked = maskPii(kept.map(toLine).join("\n"), { names });
    if (masked.text.length <= limit) {
      return masked;
    }
    if (kept.length > 1) {
      kept = kept.slice(1);
      continue;
    }
    const only = kept[0];
    const over = masked.text.length - limit;
    // 넘친 만큼 + 여유(자리표시가 원문보다 길어질 수 있음)를 앞에서 자름
    const cut = Math.min(only.text.length - 1, over + 20);
    if (cut <= 0) {
      // 보낸 사람 이름만으로 상한을 넘는 경우 (사실상 없음). 무한 반복을 막음
      throw new ServiceError("MESSAGE_TOO_LONG", "메시지가 너무 길어요");
    }
    kept = [{ ...only, text: only.text.slice(cut) }];
  }
}

export async function requestAiReply(
  input: AiReplyInput,
  { ai, store, network, now = Date.now, createId = defaultId }: AiReplyDeps
): Promise<SavedAiReply> {
  if (network && (await network.getConnectionType()) === "none") {
    throw new ServiceError(
      NETWORK_ERROR,
      "인터넷에 연결되면 답장 후보를 만들 수 있어요"
    );
  }

  const incoming = input.messages.filter((m) => !m.fromMe);
  const incomingTexts = incoming.map((m) => m.text);
  const lastSender =
    incoming[incoming.length - 1]?.sender ??
    input.messages[input.messages.length - 1]?.sender ??
    "";

  const relation = classifyRelation({
    saved: input.relation,
    senderName: lastSender,
    texts: incomingTexts,
  }).value;
  const needsDecision = classifyNeedsDecision(
    // 결정 여부는 가장 최근 메시지 몇 개만 봄 (예전 초대에 이미 답했을 수 있음)
    incomingTexts.slice(-3),
    input.needsDecision
  ).value;

  // 보낸 사람 이름도 가린다. 단, 기관·번호 발신자 이름("국민건강보험")은 개인정보가 아니고 요약에 필요해서 둠
  const senders = input.messages
    .map((m) => m.sender)
    .filter((name) => !looksLikeInstitution(name));
  const masked = maskConversation(input.messages, [...input.names, ...senders]);

  const response = await ai.reply({
    text: masked.text,
    relation,
    needsDecision,
  });

  const saved: SavedAiReply = {
    id: createId(),
    conversationId: input.conversationId,
    createdAt: now(),
    relation,
    needsDecision,
    summary: unmaskPii(response.summary, masked.mapping),
    replies: response.replies.map((r) => ({
      label: r.label,
      text: unmaskPii(r.text, masked.mapping),
    })),
  };
  await store.save(saved);
  return saved;
}
