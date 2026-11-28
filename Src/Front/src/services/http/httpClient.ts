import {
  COMMON_ERROR_CODE,
  NETWORK_ERROR,
  ServiceError,
  TIMEOUT_ERROR,
  type ErrorDetail,
} from "../common";
import type { AuthTokens } from "../auth/AuthService";
import type { TokenStore } from "../auth/tokenStore";

// 백엔드 공통 HTTP 클라이언트
// - 요청·응답은 JSON, 실패는 ServiceError로 바꿈 ({ error: { code, message, details } })
// - 타임아웃·네트워크 오류도 ServiceError(TIMEOUT_ERROR / NETWORK_ERROR)
// - 인증이 필요한 요청이 401이면 토큰을 한 번 갱신하고 다시 보냄
//   갱신(POST /auth/refresh)은 refreshTokens() 한 곳에서만 하고, 동시에 여러 요청이 401이어도 한 번만 보냄
//   (같은 refreshToken으로 두 번 갱신하면 백엔드가 재사용으로 보고 세션을 끊음)

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  tokens: TokenStore;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  body?: unknown;
  // true면 Authorization: Bearer <accessToken>을 붙이고, 401이면 갱신 후 한 번 더 보냄
  auth?: boolean;
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface HttpClient {
  request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T>;
  refreshTokens(): Promise<AuthTokens>;
  /**
   * 401을 받은 요청이 보낸 액세스 토큰을 넘기면, 그사이 다른 요청이 이미 갱신했을 때는 그 토큰을 그대로,
   * 아니면 refreshTokens()로 갱신한 토큰을 돌려줌. httpClient 밖에서 직접 보내는 요청(AI 답장)도 이걸 씀
   */
  refreshAfterUnauthorized(sentWith: string): Promise<AuthTokens>;
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: ErrorDetail[] };
}

const toServiceError = (res: Response, body: unknown) => {
  const error = (body as ErrorBody | null)?.error;
  const retryAfter = Number(res.headers?.get?.("Retry-After"));
  return new ServiceError(
    error?.code ??
      (res.status === 429
        ? COMMON_ERROR_CODE.rateLimited
        : COMMON_ERROR_CODE.internal),
    error?.message ?? `HTTP ${res.status}`,
    {
      status: res.status,
      details: error?.details,
      retryAfterSec: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    }
  );
};

export const createHttpClient = ({
  baseUrl,
  timeoutMs,
  tokens,
  fetchImpl = fetch,
}: HttpClientOptions): HttpClient => {
  let refreshing: Promise<AuthTokens> | null = null;

  const send = async (
    method: HttpMethod,
    path: string,
    body: unknown,
    accessToken?: string
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      return await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw controller.signal.aborted
        ? new ServiceError(TIMEOUT_ERROR, "응답 시간이 지났습니다.")
        : new ServiceError(NETWORK_ERROR, "서버에 연결하지 못했습니다.");
    } finally {
      clearTimeout(timer);
    }
  };

  const parse = async <T>(res: Response): Promise<T> => {
    const text = res.status === 204 ? "" : await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!res.ok) throw toServiceError(res, body);
    return body as T;
  };

  const refreshTokens = () => {
    if (!refreshing) {
      const current = tokens.get();
      refreshing = (async () => {
        if (!current) {
          throw new ServiceError(
            COMMON_ERROR_CODE.unauthorized,
            "로그인이 필요합니다.",
            { status: 401 }
          );
        }
        try {
          const res = await send("POST", "/auth/refresh", {
            refreshToken: current.refreshToken,
          });
          const next = await parse<AuthTokens>(res);
          tokens.set(next);
          return next;
        } catch (error) {
          // 갱신 토큰이 만료·재사용이면 세션이 끝난 것 → 토큰을 지워 로그인 화면으로
          // (네트워크 오류일 때는 지우지 않음. 연결되면 다시 시도할 수 있게)
          if (error instanceof ServiceError && error.status === 401) {
            tokens.set(null);
          }
          throw error;
        }
      })().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  };

  const request = async <T>(
    method: HttpMethod,
    path: string,
    { body, auth = false }: RequestOptions = {}
  ): Promise<T> => {
    const sentWith = auth ? tokens.get()?.accessToken : undefined;
    const res = await send(method, path, body, sentWith);
    if (!auth || res.status !== 401 || !sentWith) return parse<T>(res);

    const next = await refreshAfterUnauthorized(sentWith);
    return parse<T>(await send(method, path, body, next.accessToken));
  };

  // 기다리는 사이 다른 요청이 이미 갱신했으면 갱신하지 않고 새 토큰을 바로 씀
  const refreshAfterUnauthorized = async (sentWith: string) => {
    const latest = tokens.get();
    return latest && latest.accessToken !== sentWith ? latest : refreshTokens();
  };

  return { request, refreshTokens, refreshAfterUnauthorized };
};
