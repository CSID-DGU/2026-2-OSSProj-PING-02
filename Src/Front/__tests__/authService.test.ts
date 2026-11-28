import {
  createMockAuthService,
  MOCK_DEMO_ACCOUNT,
  MOCK_VERIFICATION_CODE,
} from "../src/services/auth/mockAuthService";
import { createHttpAuthService } from "../src/services/auth/httpAuthService";
import { createTokenStore } from "../src/services/auth/tokenStore";
import { createHttpClient } from "../src/services/http/httpClient";
import {
  NETWORK_ERROR,
  ServiceError,
  TIMEOUT_ERROR,
} from "../src/services/common";
import type { SignupInput } from "../src/services/auth/AuthService";
import { AUTH_ERROR, getAuthErrorMessage } from "../src/constants/auth";

// 인증 서비스: mock이 백엔드(main)처럼 동작하는지 + 실제 API로 보내는 본문 + 에러 문구

const catchError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e) {
    return e as ServiceError;
  }
  throw new Error("에러가 나야 합니다");
};

const input = (over: Partial<SignupInput> = {}): SignupInput => ({
  loginId: "newseed01",
  name: "새싹",
  birthdate: "2000-01-01",
  gender: "FEMALE",
  email: "Seed@Example.com",
  password: "abcd1234",
  termsAgreements: [
    { termsId: "terms-service", agreed: true },
    { termsId: "terms-privacy", agreed: true },
  ],
  ...over,
});

describe("mock 인증 (백엔드 main 동작)", () => {
  test("가입하면 바로 로그인, 이메일은 소문자로 저장하고 같은 이메일로 또 가입할 수 있다", async () => {
    const auth = createMockAuthService({ latency: 0 });
    const first = await auth.signup(input());
    expect(first.status).toBe("signedIn");
    if (first.status === "signedIn") {
      expect(first.result.user.email).toBe("seed@example.com");
      expect(first.result.tokens.expiresIn).toBe(1800);
    }
    const second = await auth.signup(input({ loginId: "newseed02" }));
    expect(second.status).toBe("signedIn");
  });

  test("가입 에러: 이메일 형식 400 → 필수 약관 422 → 아이디 중복 409 순서", async () => {
    const auth = createMockAuthService({ latency: 0 });
    const badEmail = await catchError(
      auth.signup(
        input({
          loginId: MOCK_DEMO_ACCOUNT.loginId,
          email: "nope",
          termsAgreements: [],
        })
      )
    );
    expect([badEmail.code, badEmail.status]).toEqual([
      "INVALID_EMAIL_FORMAT",
      400,
    ]);

    const noTerms = await catchError(
      auth.signup(
        input({ loginId: MOCK_DEMO_ACCOUNT.loginId, termsAgreements: [] })
      )
    );
    expect([noTerms.code, noTerms.status]).toEqual([
      "REQUIRED_TERMS_NOT_AGREED",
      422,
    ]);

    const taken = await catchError(
      auth.signup(input({ loginId: MOCK_DEMO_ACCOUNT.loginId }))
    );
    expect([taken.code, taken.status]).toEqual([
      "USERNAME_ALREADY_EXISTS",
      409,
    ]);

    const badId = await catchError(auth.signup(input({ loginId: "1abc" })));
    expect(badId.code).toBe("VALIDATION_FAILED");
    expect(badId.details).toEqual([{ field: "username", reason: "matches" }]);
  });

  test("로그인: 5번 연속 틀리면 5분 잠기고, 잠긴 동안은 맞아도 같은 401", async () => {
    let now = 1_000_000;
    const auth = createMockAuthService({ latency: 0, now: () => now });
    const { loginId, password } = MOCK_DEMO_ACCOUNT;
    for (let i = 0; i < 5; i += 1) {
      expect((await catchError(auth.login(loginId, "wrong1234"))).code).toBe(
        "INVALID_CREDENTIALS"
      );
    }
    const locked = await catchError(auth.login(loginId, password));
    expect([locked.code, locked.status]).toEqual(["INVALID_CREDENTIALS", 401]);

    now += 5 * 60_000 + 1;
    await expect(
      auth.login(` ${loginId.toUpperCase()} `, password)
    ).resolves.toBeTruthy();
  });

  test("비밀번호 재설정: 아이디·이메일이 맞을 때만 코드, 5번 틀리면 무효, 한 번만 사용, 10분 만료", async () => {
    let now = 0;
    const auth = createMockAuthService({ latency: 0, now: () => now });
    const { loginId, email } = MOCK_DEMO_ACCOUNT;

    // 맞지 않아도 같은 결과(성공), 코드는 만들어지지 않음
    await auth.requestPasswordReset(loginId, "other@example.com");
    expect(
      (
        await catchError(
          auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "newpass5678")
        )
      ).code
    ).toBe("VERIFICATION_CODE_INVALID");

    // 5번 틀리면 맞는 코드도 무효
    await auth.requestPasswordReset(loginId, email);
    for (let i = 0; i < 5; i += 1) {
      await catchError(auth.resetPassword(loginId, "000000", "newpass5678"));
    }
    expect(
      (
        await catchError(
          auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "newpass5678")
        )
      ).code
    ).toBe("VERIFICATION_CODE_INVALID");

    // 10분 지나면 만료
    await auth.requestPasswordReset(loginId, email);
    now += 10 * 60_000;
    expect(
      (
        await catchError(
          auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "newpass5678")
        )
      ).code
    ).toBe("VERIFICATION_CODE_INVALID");

    // 형식 오류는 400 + 필드
    await auth.requestPasswordReset(loginId, email);
    expect(
      (await catchError(auth.resetPassword(loginId, "12", "newpass5678")))
        .details?.[0].field
    ).toBe("code");
    expect(
      (
        await catchError(
          auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "short")
        )
      ).details?.[0].field
    ).toBe("newPassword");

    // 성공하면 새 비밀번호로 로그인, 같은 코드는 다시 못 씀
    await auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "newpass5678");
    await expect(auth.login(loginId, "newpass5678")).resolves.toBeTruthy();
    expect(
      (
        await catchError(
          auth.resetPassword(loginId, MOCK_VERIFICATION_CODE, "again5678")
        )
      ).code
    ).toBe("VERIFICATION_CODE_INVALID");
  });

  test("아이디 찾기는 가입 여부와 관계없이 성공, 이메일 형식만 검사", async () => {
    const auth = createMockAuthService({ latency: 0 });
    await expect(
      auth.findLoginId("nobody@example.com")
    ).resolves.toBeUndefined();
    expect((await catchError(auth.findLoginId("nope"))).code).toBe(
      "INVALID_EMAIL_FORMAT"
    );
  });

  test("자동 로그인: 갱신 토큰은 한 번만 쓰이고, 쓴 토큰·로그아웃한 토큰은 401로 지워진다", async () => {
    const tokens = createTokenStore();
    const auth = createMockAuthService({ latency: 0, tokens });
    const { tokens: first } = await auth.login(
      MOCK_DEMO_ACCOUNT.loginId,
      MOCK_DEMO_ACCOUNT.password
    );

    tokens.set(first);
    const user = await auth.restoreSession();
    expect(user.loginId).toBe(MOCK_DEMO_ACCOUNT.loginId);
    const second = tokens.get()!;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // 이미 쓴 토큰
    tokens.set(first);
    const reused = await catchError(auth.restoreSession());
    expect([reused.code, reused.status]).toEqual([
      "REFRESH_TOKEN_INVALID",
      401,
    ]);
    expect(tokens.get()).toBeNull();

    // 로그아웃한 토큰
    await auth.logout(second.refreshToken);
    tokens.set(second);
    expect((await catchError(auth.restoreSession())).code).toBe(
      "REFRESH_TOKEN_INVALID"
    );
  });

  test("자동 로그인: 앱을 다시 켜도(새 mock) 테스트 계정은 복구, 없는 계정은 401", async () => {
    const before = createMockAuthService({ latency: 0 });
    const { tokens: saved } = await before.login(
      MOCK_DEMO_ACCOUNT.loginId,
      MOCK_DEMO_ACCOUNT.password
    );
    const signup = await before.signup(input());

    const tokens = createTokenStore();
    const after = createMockAuthService({ latency: 0, tokens });
    tokens.set(saved);
    expect((await after.restoreSession()).loginId).toBe(
      MOCK_DEMO_ACCOUNT.loginId
    );
    if (signup.status === "signedIn") tokens.set(signup.result.tokens);
    expect((await catchError(after.restoreSession())).status).toBe(401);
  });
});

describe("토큰 보관소 (암호화 저장소)", () => {
  const memoryStorage = () => {
    let value: string | null = null;
    return {
      read: jest.fn(async () => value),
      write: jest.fn(async (next: string) => {
        value = next;
      }),
      remove: jest.fn(async () => {
        value = null;
      }),
    };
  };
  const t = (n: number) => ({
    accessToken: `a${n}`,
    refreshToken: `r${n}`,
    expiresIn: 1800,
  });

  // load()는 앞서 시작한 저장이 끝난 뒤 저장소를 읽음 → 저장이 끝나기를 기다리는 데 씀
  test("저장한 토큰을 다음 실행에서 불러오고, 로그아웃(null)하면 지운다", async () => {
    const storage = memoryStorage();
    const first = createTokenStore(storage);
    first.set(t(1));
    await first.load();
    const next = createTokenStore(storage);
    expect(next.get()).toBeNull();
    expect(await next.load()).toEqual(t(1));
    expect(next.get()).toEqual(t(1));

    next.set(null);
    expect(await next.load()).toBeNull();
    expect(storage.remove).toHaveBeenCalled();
  });

  test("연달아 바뀌어도 마지막 값이 남고, 깨진 값·읽기 실패는 null", async () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    store.set(t(1));
    store.set(t(2));
    store.set(null);
    store.set(t(3));
    expect(await store.load()).toEqual(t(3));

    await storage.write("not json");
    expect(await createTokenStore(storage).load()).toBeNull();
    storage.read.mockRejectedValueOnce(new Error("keystore"));
    expect(await createTokenStore(storage).load()).toBeNull();
  });

  test("저장 실패는 메모리 값에 영향을 주지 않는다", async () => {
    const storage = memoryStorage();
    storage.write.mockRejectedValueOnce(new Error("keystore"));
    const store = createTokenStore(storage);
    store.set(t(1));
    expect(store.get()).toEqual(t(1));
    // 저장소에는 못 썼지만 다음 저장은 정상
    store.set(t(2));
    expect(store.get()).toEqual(t(2));
    expect(await store.load()).toEqual(t(2));
    expect(storage.write).toHaveBeenCalledTimes(2);
  });
});

describe("실제 API 본문 (Doc/API_목록.md)", () => {
  const setup = () => {
    const calls: { method: string; url: string; body?: any; auth?: string }[] =
      [];
    const tokens = createTokenStore();
    const fetchImpl = (async (url: string, init: any) => {
      calls.push({
        method: init.method,
        url,
        body: init.body ? JSON.parse(init.body) : undefined,
        auth: init.headers.Authorization,
      });
      if (url.endsWith("/auth/refresh")) {
        return new Response(
          JSON.stringify({
            accessToken: "a2",
            refreshToken: "r2",
            expiresIn: 1800,
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/users/me")) {
        return new Response(
          JSON.stringify({
            id: "u1",
            username: "newseed01",
            name: "새싹",
            email: "seed@example.com",
            gender: "FEMALE",
          }),
          { status: 200 }
        );
      }
      if (url.endsWith("/auth/signup") || url.endsWith("/auth/login")) {
        return new Response(
          JSON.stringify({
            user: {
              id: "u1",
              username: "newseed01",
              name: "새싹",
              email: "seed@example.com",
            },
            tokens: { accessToken: "a1", refreshToken: "r1", expiresIn: 1800 },
          }),
          { status: url.endsWith("/auth/signup") ? 201 : 200 }
        );
      }
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    const http = createHttpClient({
      baseUrl: "http://server/v1",
      timeoutMs: 1000,
      tokens,
      fetchImpl,
    });
    return { auth: createHttpAuthService(http), calls, tokens };
  };

  test("가입은 SignupDto 필드만(email 포함) 보내고 username으로 바꾼다", async () => {
    const { auth, calls } = setup();
    const res = await auth.signup(input({ email: "seed@example.com" }));
    expect(res.status).toBe("signedIn");
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "http://server/v1/auth/signup",
    });
    expect(Object.keys(calls[0].body).sort()).toEqual(
      [
        "birthdate",
        "email",
        "gender",
        "name",
        "password",
        "termsAgreements",
        "username",
      ].sort()
    );
    if (res.status === "signedIn")
      expect(res.result.user.loginId).toBe("newseed01");
  });

  test("내 정보 API(#62): 비밀번호 확인·수정(바꾼 항목만)·비밀번호 변경·탈퇴 경로와 본문", async () => {
    const { auth, calls, tokens } = setup();
    tokens.set({ accessToken: "a1", refreshToken: "r1", expiresIn: 1800 });
    await auth.verifyPassword("abcd1234");
    const user = await auth.updateProfile({
      password: "abcd1234",
      email: "new@example.com",
    });
    await auth.changePassword("abcd1234", "efgh5678");
    await auth.deleteAccount("efgh5678");
    expect(
      calls.map((c) => [
        c.method,
        c.url.replace("http://server/v1", ""),
        c.body,
        c.auth,
      ])
    ).toEqual([
      [
        "POST",
        "/users/me/password/verify",
        { password: "abcd1234" },
        "Bearer a1",
      ],
      // 바꾸지 않을 항목(undefined)은 보내지 않음
      [
        "PATCH",
        "/users/me",
        { password: "abcd1234", email: "new@example.com" },
        "Bearer a1",
      ],
      [
        "PATCH",
        "/users/me/password",
        { currentPassword: "abcd1234", newPassword: "efgh5678" },
        "Bearer a1",
      ],
      ["DELETE", "/users/me", { password: "efgh5678" }, "Bearer a1"],
    ]);
    expect(user.loginId).toBe("newseed01");
  });

  test("찾기·재설정·로그아웃 경로와 본문", async () => {
    const { auth, calls, tokens } = setup();
    await auth.findLoginId("seed@example.com");
    await auth.requestPasswordReset("newseed01", "seed@example.com");
    await auth.resetPassword("newseed01", "123456", "newpass5678");
    tokens.set({ accessToken: "a1", refreshToken: "r1", expiresIn: 1800 });
    await auth.logout("r1");
    expect(
      calls.map((c) => [c.url.replace("http://server/v1", ""), c.body])
    ).toEqual([
      ["/auth/username/find", { email: "seed@example.com" }],
      [
        "/auth/password/forgot",
        { username: "newseed01", email: "seed@example.com" },
      ],
      [
        "/auth/password/reset",
        { username: "newseed01", code: "123456", newPassword: "newpass5678" },
      ],
      ["/auth/logout", { refreshToken: "r1" }],
    ]);
    expect(calls[3].auth).toBe("Bearer a1");
  });

  test("자동 로그인은 refresh로 토큰을 바꾼 뒤 새 토큰으로 내 정보를 받는다", async () => {
    const { auth, calls, tokens } = setup();
    tokens.set({ accessToken: "a1", refreshToken: "r1", expiresIn: 1800 });
    const user = await auth.restoreSession();
    expect(user).toEqual({
      id: "u1",
      loginId: "newseed01",
      name: "새싹",
      email: "seed@example.com",
      gender: "FEMALE",
    });
    expect(
      calls.map((c) => [
        c.method,
        c.url.replace("http://server/v1", ""),
        c.body,
        c.auth,
      ])
    ).toEqual([
      ["POST", "/auth/refresh", { refreshToken: "r1" }, undefined],
      ["GET", "/users/me", undefined, "Bearer a2"],
    ]);
    expect(tokens.get()?.refreshToken).toBe("r2");
  });
});

describe("에러 문구 (부드럽게)", () => {
  const err = (
    code: string,
    extra: ConstructorParameters<typeof ServiceError>[2] = {}
  ) => new ServiceError(code, "server message", extra);

  test.each([
    [err(NETWORK_ERROR), AUTH_ERROR.network],
    [err(TIMEOUT_ERROR), AUTH_ERROR.timeout],
    [err("VALIDATION_FAILED", { status: 400 }), AUTH_ERROR.checkInput],
    [err("INVALID_EMAIL_FORMAT", { status: 400 }), AUTH_ERROR.emailInvalid],
    [err("INTERNAL_ERROR", { status: 500 }), AUTH_ERROR.server],
    [err("UPSTREAM_UNAVAILABLE", { status: 503 }), AUTH_ERROR.server],
    [
      err("RATE_LIMITED", { status: 429, retryAfterSec: 60 }),
      "요청이 잠시 많았어요. 1분쯤 쉬었다가 다시 해 주세요.",
    ],
    [
      err("RATE_LIMITED", { status: 429, retryAfterSec: 30 }),
      "요청이 잠시 많았어요. 30초쯤 쉬었다가 다시 해 주세요.",
    ],
    [new Error("?"), AUTH_ERROR.network],
  ])("%#", (error, message) => {
    expect(getAuthErrorMessage(error)).toBe(message);
  });
});
