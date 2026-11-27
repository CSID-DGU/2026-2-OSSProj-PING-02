import type { ContactsNative } from "../src/native/Contacts";
import { createDeviceContactsService } from "../src/services/contacts/ContactsService";
import {
  createDevicePermissionService,
  READ_CONTACTS,
  type AndroidPermissionApi,
  type NotificationAccessApi,
} from "../src/services/permission/devicePermissionService";
import { createMockPermissionService } from "../src/services/permission/mockPermissionService";

// #70 기기 연락처 읽기 + 연락처 권한 (Kotlin Contacts 모듈·PermissionsAndroid 위의 서비스)

describe("기기 연락처", () => {
  test("네이티브가 읽은 이름·전화번호를 그대로 돌려준다 (다른 값은 버림)", async () => {
    const native: ContactsNative = {
      getAll: async () => [
        { id: "1", name: "김민지", phone: "010-1234-5678", email: "x@y.z" } as never,
        { id: "2", name: "010-9999-0000", phone: "010-9999-0000" },
      ],
    };
    expect(await createDeviceContactsService(native).getAll()).toEqual([
      { id: "1", name: "김민지", phone: "010-1234-5678" },
      { id: "2", name: "010-9999-0000", phone: "010-9999-0000" },
    ]);
  });

  test("권한이 없으면 오류 (09 화면이 '연락처를 불러오지 못했어요'를 보여 줌)", async () => {
    const native: ContactsNative = {
      getAll: async () => {
        throw Object.assign(new Error("x"), { code: "E_PERMISSION" });
      },
    };
    await expect(createDeviceContactsService(native).getAll()).rejects.toThrow();
  });
});

describe("연락처 권한", () => {
  /** 가짜 PermissionsAndroid. results: request 때마다 차례로 돌려줄 결과 */
  const fakeAndroid = (results: string[]) => {
    let granted = false;
    const calls: string[] = [];
    const api: AndroidPermissionApi = {
      async check(p) {
        calls.push(`check:${p}`);
        return granted;
      },
      async request(p) {
        calls.push(`request:${p}`);
        const next = results.shift() ?? "denied";
        granted = next === "granted";
        return next;
      },
      async openSettings() {
        calls.push("settings");
      },
    };
    return { api, calls, grant: () => (granted = true) };
  };

  test("허용하면 granted", async () => {
    const { api, calls } = fakeAndroid(["granted"]);
    const service = createDevicePermissionService(api, createMockPermissionService());
    expect(await service.request("contacts")).toEqual({ status: "granted", openedSettings: false });
    expect((await service.checkAll()).contacts).toBe("granted");
    expect(calls).toContain(`request:${READ_CONTACTS}`);
  });

  test("거부하면 denied, 다시 묻지 않음이면 blocked이고 다시 확인해도 blocked로 남는다", async () => {
    const { api } = fakeAndroid(["denied", "never_ask_again"]);
    const service = createDevicePermissionService(api, createMockPermissionService());
    expect((await service.request("contacts")).status).toBe("denied");
    expect((await service.checkAll()).contacts).toBe("denied");
    expect((await service.request("contacts")).status).toBe("blocked");
    // 화면은 요청 직후 checkAll로 다시 확인함 → 여기서 denied로 돌아가면 설정 안내가 안 나옴
    expect((await service.checkAll()).contacts).toBe("blocked");
  });

  test("blocked에서 설정을 열고 켜고 돌아오면 granted", async () => {
    const { api, calls, grant } = fakeAndroid(["never_ask_again"]);
    const service = createDevicePermissionService(api, createMockPermissionService());
    await service.request("contacts");
    await service.openSettings("contacts");
    expect(calls).toContain("settings");
    grant();
    expect((await service.checkAll()).contacts).toBe("granted");
  });

  test("연락처 말고 다른 권한은 지금처럼 mock이 처리한다", async () => {
    const { api, calls } = fakeAndroid([]);
    const fallback = createMockPermissionService();
    const service = createDevicePermissionService(api, fallback);
    const all = await service.checkAll();
    expect(all.notificationListener).toBe("denied");
    expect((await service.request("postNotifications")).status).toBe("granted");
    await service.openSettings("notificationListener");
    expect(calls.filter(c => c.startsWith("request") || c === "settings")).toEqual([]);
  });
});

describe("알림 접근 권한 (#83, NotificationStore 설정 화면)", () => {
  const fakeAccess = (initiallyGranted = false) => {
    let granted = initiallyGranted;
    const calls: string[] = [];
    const access: NotificationAccessApi = {
      async isGranted() {
        calls.push("isGranted");
        return granted;
      },
      async openSettings() {
        calls.push("openSettings");
      },
    };
    // 사용자가 설정에서 켜고 돌아온 상황
    return { access, calls, grant: () => (granted = true), revoke: () => (granted = false) };
  };
  const noAndroid: AndroidPermissionApi = {
    check: async () => false,
    request: async () => "denied",
    openSettings: async () => {},
  };

  test("꺼져 있으면 denied, 요청하면 설정 화면을 열고, 켜고 돌아오면 granted", async () => {
    const { access, calls, grant } = fakeAccess();
    const service = createDevicePermissionService(noAndroid, createMockPermissionService(), access);

    expect((await service.checkAll()).notificationListener).toBe("denied");
    // 팝업이 없어서 설정으로 보냄 → 화면은 "설정에 다녀오는 중"으로 기다림
    expect(await service.request("notificationListener")).toEqual({
      status: "denied",
      openedSettings: true,
    });
    expect(calls).toContain("openSettings");

    grant();
    expect((await service.checkAll()).notificationListener).toBe("granted");
  });

  test("이미 켜져 있으면 설정을 열지 않고 granted, 나중에 끄면 다시 denied", async () => {
    const { access, calls, revoke } = fakeAccess(true);
    const service = createDevicePermissionService(noAndroid, createMockPermissionService(), access);

    expect(await service.request("notificationListener")).toEqual({
      status: "granted",
      openedSettings: false,
    });
    expect(calls).not.toContain("openSettings");

    revoke();
    expect((await service.checkAll()).notificationListener).toBe("denied");
  });

  test("설정 열기(설정 다시 열기 버튼)도 알림 접근 설정 화면으로", async () => {
    const { access, calls } = fakeAccess();
    const service = createDevicePermissionService(noAndroid, createMockPermissionService(), access);
    await service.openSettings("notificationListener");
    expect(calls).toEqual(["openSettings"]);
  });

  test("연락처 권한은 그대로 PermissionsAndroid가 처리한다", async () => {
    const { access } = fakeAccess(true);
    const androidCalls: string[] = [];
    const android: AndroidPermissionApi = {
      check: async p => {
        androidCalls.push(`check:${p}`);
        return false;
      },
      request: async p => {
        androidCalls.push(`request:${p}`);
        return "granted";
      },
      openSettings: async () => {
        androidCalls.push("settings");
      },
    };
    const service = createDevicePermissionService(android, createMockPermissionService(), access);
    expect((await service.request("contacts")).status).toBe("granted");
    expect(androidCalls).toEqual([`request:${READ_CONTACTS}`]);
  });
});
