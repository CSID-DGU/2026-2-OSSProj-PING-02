import { delay, NETWORK_ERROR, ServiceError, TIMEOUT_ERROR } from "../common";
import { classifyNeedsDecision } from "./classifyMessage";

// AI 답장 API (백엔드 PR #36, Doc/AI_답장_API_명세.md의 POST /v1/ai/reply)
// 서버는 마스킹된 문장을 OpenRouter(ZDR)로 넘기는 통로이고 아무것도 저장하지 않음
// AI가 요약하면서 결정(수락·보류·거절)이 필요한 메시지인지도 판단함
//   - 결정이 필요하면: 입장 3 × 말투 3 = 답장 9개 (사용자가 입장을 먼저 고르고, 그다음 말투)
//   - 아니면(안부·인사 등): 말투별 답장 3개
// services/index.ts가 API 모드(http)일 때 createHttpAiReplyService, 아니면 mock을 넣음

/** 보낸 사람과의 관계. 답장 말투를 정함 (친구 반말 / 윗사람 존댓말 / 기관 격식체) */
export type Relation = "FRIEND" | "SUPERIOR" | "INSTITUTION";

export interface AiReplyRequest {
  /** 마스킹을 끝낸 메시지 (최대 AI_MAX_INPUT_CHARS자) */
  text: string;
  relation: Relation;
  /** 선택. 앱이 결정 여부를 이미 정한 경우만. 보내지 않으면 AI가 판단함 */
  needsDecision?: boolean;
}

export type AiStance = "ACCEPT" | "HOLD" | "DECLINE";
export type AiTone = "SHORT" | "WARM" | "POLITE";

/** 응답 순서: 입장 수락 → 보류 → 거절, 각 입장 안에서 말투 짧게 → 다정하게 → 공손하게 */
export const AI_STANCES: AiStance[] = ["ACCEPT", "HOLD", "DECLINE"];
export const AI_TONES: AiTone[] = ["SHORT", "WARM", "POLITE"];

export interface AiReplyCandidate {
  /** 결정이 필요한 메시지의 답장에만 있음 */
  stance?: AiStance;
  tone: AiTone;
  text: string;
}

export interface AiReplyResponse {
  summary: string;
  /** AI가 판단한(또는 앱이 정해 보낸) 결정 필요 여부 */
  needsDecision: boolean;
  /** needsDecision이면 9개, 아니면 3개 */
  replies: AiReplyCandidate[];
}

/** 서버 입력 길이 상한 (서버 AI_MAX_INPUT_CHARS 기본값과 맞춤) */
export const AI_MAX_INPUT_CHARS = 1000;

// 서버 에러 코드 중 앱에서 분기하는 것 (명세 3장)
export const AI_ERROR_CODE = {
  validationFailed: "VALIDATION_FAILED",
  // 앱 마스킹 누락. 사용자에게는 일반 오류로 보여 주고 버그로 기록
  unmaskedContent: "UNMASKED_CONTENT",
  unauthorized: "UNAUTHORIZED",
  rateLimited: "RATE_LIMITED",
  responseInvalid: "AI_RESPONSE_INVALID",
  upstreamUnavailable: "UPSTREAM_UNAVAILABLE",
  upstreamTimeout: "UPSTREAM_TIMEOUT",
} as const;

export interface AiReplyService {
  reply(request: AiReplyRequest): Promise<AiReplyResponse>;
}

export interface HttpAiReplyServiceOptions {
  /** 예: https://api.example.com/v1 (끝에 / 없이) */
  baseUrl: string;
  getAccessToken(): Promise<string | null>;
  /** 401일 때 한 번만 부름. 새 액세스 토큰을 돌려주고, 갱신 실패면 null */
  refreshAccessToken?(): Promise<string | null>;
  fetchImpl?: typeof fetch;
  /** 서버 시간 제한(30초)보다 길게 */
  timeoutMs?: number;
}

const toServiceError = async (res: Response): Promise<ServiceError> => {
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body?.error?.code) {
      return new ServiceError(
        body.error.code,
        body.error.message ?? "답장을 만들지 못했어요"
      );
    }
  } catch {
    // 본문이 JSON이 아니면 아래 기본 에러로
  }
  return new ServiceError(
    AI_ERROR_CODE.upstreamUnavailable,
    "답장을 만들지 못했어요. 잠시 후 다시 시도해 주세요"
  );
};

export const createHttpAiReplyService = ({
  baseUrl,
  getAccessToken,
  refreshAccessToken,
  fetchImpl = fetch,
  timeoutMs = 35_000,
}: HttpAiReplyServiceOptions): AiReplyService => {
  const post = async (request: AiReplyRequest, token: string | null) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(`${baseUrl}/ai/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch {
      // 서버에 닿지 못함. 화면이 다른 오류와 구분할 수 있게 앱 공통 코드로 바꿈
      throw controller.signal.aborted
        ? new ServiceError(TIMEOUT_ERROR, "답장을 만드는 데 시간이 너무 걸려요. 다시 시도해 주세요")
        : new ServiceError(NETWORK_ERROR, "서버에 연결하지 못했어요");
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    async reply(request) {
      let res = await post(request, await getAccessToken());
      if (res.status === 401 && refreshAccessToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          res = await post(request, refreshed);
        }
      }
      if (!res.ok) {
        throw await toServiceError(res);
      }
      return (await res.json()) as AiReplyResponse;
    },
  };
};

// mock: 서버 없이 화면을 만들 때 사용. 받은 문장의 첫 이름 자리표시를 답장에 넣어 되돌리기까지 확인할 수 있게 함
// 결정 여부는 AI 대신 기기 규칙(classifyNeedsDecision)으로 흉내 냄
export const createMockAiReplyService = (): AiReplyService => ({
  async reply({ text, relation, needsDecision }) {
    await delay(800);
    const decided =
      needsDecision ?? classifyNeedsDecision(text.split("\n").slice(-3)).value;
    const who = text.match(/\[이름\d+\]/)?.[0] ?? "";
    const polite = relation !== "FRIEND";
    const end = (casual: string, formal: string) => (polite ? formal : casual);
    const call = who ? `${who}${polite ? "님, " : "아, "}` : "";

    if (!decided) {
      return {
        summary: "상대가 안부를 전했어요.",
        needsDecision: false,
        replies: [
          { tone: "SHORT", text: end("응 알겠어!", "네, 알겠습니다.") },
          { tone: "WARM", text: `${call}${end("연락 줘서 고마워!", "연락 주셔서 감사해요!")}` },
          { tone: "POLITE", text: end("알려줘서 고마워, 확인했어", "말씀 감사합니다. 확인했습니다.") },
        ],
      };
    }

    const byStance: Record<AiStance, [string, string, string]> = {
      ACCEPT: [
        end("좋아!", "좋습니다."),
        `${call}${end("좋아! 불러 줘서 고마워, 그때 보자", "좋아요! 불러 주셔서 감사해요, 그때 뵐게요")}`,
        end("좋아, 그때 보자", "좋습니다. 그때 뵙겠습니다."),
      ],
      HOLD: [
        end("확인하고 알려줄게", "확인하고 말씀드릴게요"),
        `${call}${end("일정 보고 금방 알려줄게!", "일정 확인하고 금방 말씀드릴게요!")}`,
        end("일정 확인해 보고 알려줄게", "일정을 확인한 뒤 말씀드리겠습니다."),
      ],
      DECLINE: [
        end("이번엔 어려워", "이번엔 어렵습니다"),
        `${call}${end("아쉽지만 이번엔 어려울 것 같아, 미안해", "아쉽지만 이번엔 어려울 것 같아요, 죄송해요")}`,
        end("이번에는 어려울 것 같아, 미안해", "이번에는 어려울 것 같습니다. 죄송합니다."),
      ],
    };
    return {
      summary: "상대가 제안을 했어요.",
      needsDecision: true,
      replies: AI_STANCES.flatMap(stance =>
        AI_TONES.map((tone, i) => ({ stance, tone, text: byStance[stance][i] }))
      ),
    };
  },
});
