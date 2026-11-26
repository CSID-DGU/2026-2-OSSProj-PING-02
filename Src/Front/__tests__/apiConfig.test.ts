import { API_CONFIG, resolveApiMode } from "../src/services/config";

describe("API 모드 (빌드별)", () => {
  it("테스트에서는 DEV_API_MODE와 상관없이 mock", () => {
    expect(resolveApiMode({ isTest: true, isDev: true, devMode: "http" })).toBe(
      "mock",
    );
    expect(API_CONFIG.mode).toBe("mock");
  });

  it("release 빌드는 항상 실서버(http)", () => {
    expect(
      resolveApiMode({ isTest: false, isDev: false, devMode: "mock" }),
    ).toBe("http");
  });

  it("debug 빌드는 DEV_API_MODE를 따름", () => {
    expect(resolveApiMode({ isTest: false, isDev: true, devMode: "mock" })).toBe(
      "mock",
    );
    expect(resolveApiMode({ isTest: false, isDev: true, devMode: "http" })).toBe(
      "http",
    );
  });

  it("실서버 주소는 https", () => {
    expect(API_CONFIG.baseUrl).toMatch(/^https:\/\//);
  });
});
