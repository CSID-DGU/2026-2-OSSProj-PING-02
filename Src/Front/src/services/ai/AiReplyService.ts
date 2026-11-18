import { delay, ServiceError } from "../common";

// AI 답장 API (백엔드 PR #36, Doc/AI_답장_API_명세.md의 POST /v1/ai/reply)
// 서버는 마스킹된 문장을 OpenRouter(ZDR)로 넘기는 통로이고 아무것도 저장하지 않음
// 실제 연결 시 services/index.ts에서 mock 대신 createHttpAiReplyService를 넣으면 됨

/** 보낸 사람과의 관계. 답장 말투를 정함 (친구 반말 / 윗사람 존댓말 / 기관 격식체) */
export type Relation = "FRIEND" | "SUPERIOR" | "INSTITUTION";

export interface AiReplyRequest {
  /** 마스킹을 끝낸 메시지 (최대 AI_MAX_INPUT_CHARS자) */
  text: string;
  relation: Relation;
  /** 초대·부탁처럼 수락/거절을 정해야 하는 메시지인지 */
  needsDecision: boolean;
}

export interface AiReplyCandidate {
  /** needsDecision이면 수락·보류·거절, 아니면 짧게·다정하게·공손하게 */
  label: string;
  text: string;
}

export interface AiReplyResponse {
  summary: string;
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
  /** 서버 시간 제한(20초)보다 길게 */
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
  timeoutMs = 25_000,
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
export const createMockAiReplyService = (): AiReplyService => ({
  async reply({ text, relation, needsDecision }) {
    await delay(800);
    const who = text.match(/\[이름\d+\]/)?.[0] ?? "";
    const polite = relation !== "FRIEND";
    const end = (casual: string, formal: string) => (polite ? formal : casual);
    const call = who ? `${who}${polite ? "님, " : "아, "}` : "";
    const replies: AiReplyCandidate[] = needsDecision
      ? [
          {
            label: "수락",
            text: `${call}${end("좋아! 그때 보자", "좋습니다. 그때 뵐게요")}`,
          },
          {
            label: "보류",
            text: `${call}${end(
              "일정 확인하고 알려줄게",
              "일정 확인하고 말씀드릴게요"
            )}`,
          },
          {
            label: "거절",
            text: `${call}${end(
              "이번엔 어려울 것 같아, 미안해",
              "이번에는 어려울 것 같습니다. 죄송해요"
            )}`,
          },
        ]
      : [
          { label: "짧게", text: end("응 알겠어!", "네, 알겠습니다.") },
          {
            label: "다정하게",
            text: `${call}${end("연락 줘서 고마워!", "연락 주셔서 감사해요!")}`,
          },
          {
            label: "공손하게",
            text: end(
              "알려줘서 고마워, 확인했어",
              "말씀 감사합니다. 확인했습니다."
            ),
          },
        ];
    return { summary: "상대가 메시지를 보냈어요.", replies };
  },
});
