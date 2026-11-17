import { createHttpClient } from "../src/services/http/httpClient";
import { createMemoryTokenStore } from "../src/services/auth/tokenStore";
import { ServiceError } from "../src/services/common";

// 실제 서버 없이 fetch를 흉내 내서 HTTP 클라이언트 동작을 확인
type Handler = (
  url: string,
  init: RequestInit & { headers: Record<string, string> }
) => Promise<Response> | Response;

const json = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const setup = (handler: Handler, timeoutMs = 1000) => {
  const tokens = createMemoryTokenStore();
  const calls: { url: string; auth?: string; body?: unknown }[] = [];
  const fetchImpl = (async (url: string, init: any) => {
    calls.push({
      url,
      auth: init.headers.Authorization,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    return handler(url, init);
  }) as unknown as typeof fetch;
  const client = createHttpClient({
    baseUrl: "http://server/v1",
    timeoutMs,
    tokens,
    fetchImpl,
  });
  return { client, tokens, calls };
};

const catchError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e) {
    return e as ServiceError;
  }
  throw new Error("에러가 나야 합니다");
};

test("서버 에러 형식을 ServiceError로 바꾼다", async () => {
  const { client } = setup(() =>
    json(409, {
      error: {
        code: "USERNAME_ALREADY_EXISTS",
        message: "이미 사용 중인 아이디입니다.",
        details: [],
      },
    })
  );
  const error = await catchError(client.request("POST", "/auth/signup", { body: {} }));
  expect(error).toBeInstanceOf(ServiceError);
  expect(error.code).toBe("USERNAME_ALREADY_EXISTS");
  expect(error.status).toBe(409);
});

test("400은 details를, 429는 Retry-After를 담는다", async () => {
  const { client } = setup(url =>
    url.endsWith("/a")
      ? json(400, {
          error: {
            code: "VALIDATION_FAILED",
            message: "입력값 오류",
            details: [{ field: "username", reason: "matches" }],
          },
        })
      : json(429, { error: { code: "RATE_LIMITED", message: "많음" } }, { "Retry-After": "60" })
  );
  const bad = await catchError(client.request("POST", "/a"));
  expect(bad.details).toEqual([{ field: "username", reason: "matches" }]);
  const limited = await catchError(client.request("POST", "/b"));
  expect(limited.code).toBe("RATE_LIMITED");
  expect(limited.retryAfterSec).toBe(60);
});

test("연결 실패는 NETWORK_ERROR, 응답이 늦으면 TIMEOUT_ERROR", async () => {
  const offline = setup(() => {
    throw new TypeError("Network request failed");
  });
  expect((await catchError(offline.client.request("GET", "/terms"))).code).toBe(
    "NETWORK_ERROR"
  );

  const slow = setup(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    20
  );
  expect((await catchError(slow.client.request("GET", "/terms"))).code).toBe(
    "TIMEOUT_ERROR"
  );
});

test("204는 본문 없이 성공한다", async () => {
  const { client } = setup(() => new Response(null, { status: 204 }));
  await expect(client.request("POST", "/auth/logout", { auth: true })).resolves.toBeNull();
});

test("401이면 갱신은 한 번만 보내고, 새 토큰으로 다시 요청한다", async () => {
  let refreshCount = 0;
  const { client, tokens, calls } = setup(async (url, init) => {
    if (url.endsWith("/auth/refresh")) {
      refreshCount += 1;
      await new Promise<void>(resolve => setTimeout(resolve, 10));
      return json(200, { accessToken: "access-2", refreshToken: "refresh-2", expiresIn: 1800 });
    }
    return init.headers.Authorization === "Bearer access-2"
      ? json(200, { ok: true })
      : json(401, { error: { code: "UNAUTHORIZED", message: "만료" } });
  });
  tokens.set({ accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 1800 });

  const results = await Promise.all([
    client.request("GET", "/users/me", { auth: true }),
    client.request("GET", "/users/me", { auth: true }),
    client.request("GET", "/users/me", { auth: true }),
  ]);

  expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  expect(refreshCount).toBe(1);
  expect(calls.find(c => c.url.endsWith("/auth/refresh"))?.body).toEqual({
    refreshToken: "refresh-1",
  });
  expect(tokens.get()?.refreshToken).toBe("refresh-2");
});

test("갱신 토큰이 만료되면 토큰을 지운다 (로그인 화면으로)", async () => {
  const { client, tokens } = setup(url =>
    url.endsWith("/auth/refresh")
      ? json(401, { error: { code: "REFRESH_TOKEN_INVALID", message: "만료" } })
      : json(401, { error: { code: "UNAUTHORIZED", message: "만료" } })
  );
  tokens.set({ accessToken: "a", refreshToken: "r", expiresIn: 1800 });
  const cleared = jest.fn();
  tokens.subscribe(cleared);

  const error = await catchError(client.request("GET", "/users/me", { auth: true }));
  expect(error.code).toBe("REFRESH_TOKEN_INVALID");
  expect(tokens.get()).toBeNull();
  expect(cleared).toHaveBeenCalledWith(null);
});

test("인증이 필요 없는 요청의 401은 갱신하지 않는다 (로그인 실패)", async () => {
  const { client, tokens, calls } = setup(() =>
    json(401, { error: { code: "INVALID_CREDENTIALS", message: "불일치" } })
  );
  tokens.set({ accessToken: "a", refreshToken: "r", expiresIn: 1800 });
  const error = await catchError(client.request("POST", "/auth/login", { body: {} }));
  expect(error.code).toBe("INVALID_CREDENTIALS");
  expect(calls).toHaveLength(1);
});
