import ReactTestRenderer from "react-test-renderer";
import { MOCK_DEMO_ACCOUNT } from "../src/services/auth/mockAuthService";
import { AUTH_ERROR_CODE, services, STORAGE_KEYS } from "../src/services";
import {
  findText,
  press,
  pressByRole,
  renderApp,
  type,
  waitForNoText,
  waitForText,
} from "../test-utils/app";

// 08 설정 (#60): H01 설정 메인 + H08 로그아웃·회원 탈퇴

const ONBOARDING_KEY = `${STORAGE_KEYS.onboarding}.mock-user-demo`;

// 로그인 + 온보딩을 마친 상태로 설정 탭을 엶
const openSettings = async () => {
  const login = await services.auth.login(
    MOCK_DEMO_ACCOUNT.loginId,
    MOCK_DEMO_ACCOUNT.password
  );
  services.tokens.set(login.tokens);
  await services.storage.setItem(
    ONBOARDING_KEY,
    JSON.stringify({
      completed: true,
      lastStep: "OnboardingDone",
      linkedApps: ["KAKAOTALK", "SMS"],
    })
  );
  const root = await renderApp();
  await waitForText(root, "오늘의 도움 수준");
  await pressByRole(root, "tab", "설정");
  await waitForText(root, "내 계정");
  return root;
};

describe("설정 메인", () => {
  test("프로필 카드와 시안의 메뉴 묶음을 보여 준다", async () => {
    const root = await openSettings();

    // 앱을 켤 때 받은 내 정보(GET /users/me)의 이름·아이디·생년월일
    expect(findText(root, MOCK_DEMO_ACCOUNT.name).length).toBeGreaterThan(0);
    expect(findText(root, MOCK_DEMO_ACCOUNT.loginId).length).toBe(1);
    expect(findText(root, "1997.02.12").length).toBe(1);
    const profile = root.find(
      (n) =>
        typeof n.props.accessibilityLabel === "string" &&
        n.props.accessibilityLabel.includes("연결한 앱")
    );
    expect(profile.props.accessibilityLabel).toContain("카카오톡, 문자 메신저");

    for (const title of [
      "내 계정",
      "연락 설정",
      "AI 맞춤 설정",
      "알림",
      "데이터 및 개인정보",
      "계정 관리",
      "내 정보",
      "연락처 불러오기",
      "확인할 메신저 앱",
      "내 상황과 답장 기준",
      "알림 설정",
      "저장된 데이터",
      "로그아웃",
      "회원 탈퇴",
    ]) {
      expect(findText(root, title).length).toBeGreaterThan(0);
    }
  });

  test("뒤로가기를 누르면 홈 탭으로 간다", async () => {
    const root = await openSettings();
    await pressByRole(root, "button", "뒤로 가기");
    await waitForText(root, "오늘의 도움 수준");
  });
});

describe("로그아웃", () => {
  test("취소하면 그대로 있고, 로그아웃하면 스플래시로 간다", async () => {
    const root = await openSettings();

    await press(root, "로그아웃");
    await waitForText(root, "이 기기에서 로그아웃 할까요?");
    await press(root, "취소");
    await waitForNoText(root, "이 기기에서 로그아웃 할까요?");

    await press(root, "로그아웃");
    await pressByRole(root, "button", "닫기");
    await waitForNoText(root, "이 기기에서 로그아웃 할까요?");

    await press(root, "로그아웃");
    await press(root, "로그아웃");
    await waitForText(root, "시작하기");
    expect(services.tokens.get()).toBeNull();
  });
});

describe("저장된 데이터 (H07)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const dot = (ms: number) => {
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  };
  const reply = (id: string, conversationId: string, withReplies: boolean) => ({
    id,
    conversationId,
    createdAt: Date.now(),
    relation: "FRIEND" as const,
    needsDecision: false,
    summary: "요약",
    replies: withReplies ? [{ tone: "SHORT" as const, text: "응" }] : [],
  });

  const openStoredData = async () => {
    const root = await openSettings();
    await press(root, "저장된 데이터");
    await waitForText(root, "수집 원문 전체 캐시");
    return root;
  };

  test("원문은 가입일부터 30일 뒤 삭제 예정으로 보이고, 지금 삭제하면 오늘부터 다시 센다", async () => {
    const root = await openStoredData();
    // mock 계정은 3일 전 가입, mock 원문 128건
    const next = Date.now() + 27 * DAY;
    await waitForText(root, `128건 ${dot(next)} 삭제 예정`);

    await press(root, "수집 원문 전체 캐시");
    expect(findText(root, "-").length).toBe(1); // 아직 지운 적 없음
    expect(findText(root, dot(next)).length).toBe(1);

    await press(root, "원문 128개 지금 바로 삭제하기");
    await waitForText(root, "말씨앗에 저장된 원문 128개를\n모두 삭제할까요?");
    const nextDate = new Date(next);
    expect(
      findText(
        root,
        `지금 삭제하지 않아도 ${
          nextDate.getMonth() + 1
        }월 ${nextDate.getDate()}일에 자동 삭제돼요.`
      ).length
    ).toBe(1);
    await press(root, "128개 모두 삭제하기");
    await waitForText(root, "원문 128개가 모두 삭제됐어요");
    await waitForText(root, "0건");
    expect(findText(root, dot(Date.now())).length).toBe(1);
    expect(findText(root, dot(Date.now() + 30 * DAY)).length).toBe(1);
  });

  test("요약·답장 기록 수를 보여 주고 모두 지운다", async () => {
    const root = await openStoredData();
    await services.aiReplies.save(reply("r1", "c1", true));
    await services.aiReplies.save(reply("r2", "c2", false));
    // 다시 읽게 다른 화면에 갔다 옴
    await pressByRole(root, "button", "뒤로 가기");
    await press(root, "저장된 데이터");
    await waitForText(root, "3건");

    await press(root, "요약·답장 기록");
    expect(findText(root, "2건").length).toBe(1); // 요약 연락
    expect(findText(root, "1건").length).toBe(1); // 답장
    await press(root, "요약·답장 기록 3건 삭제하기");
    await waitForText(root, "저장된 요약·답장 기록 3개를\n모두 삭제할까요?");
    await press(root, "3개 모두 삭제하기");
    await waitForText(root, "저장된 요약·답장 기록 3개가 모두 삭제됐어요");
    expect(await services.aiReplies.stats()).toEqual({
      summaries: 0,
      replies: 0,
    });
  });

  test("친구별 원문 캐시는 친구 탭으로 간다", async () => {
    const root = await openStoredData();
    await press(root, "친구별 원문 캐시");
    const selected = () =>
      root
        .findAll(
          (n) =>
            typeof n.type === "string" &&
            n.props.accessibilityRole === "tab" &&
            n.props.accessibilityState?.selected
        )
        .map((n) => n.props.accessibilityLabel);
    expect(selected()).toEqual(["친구"]);
  });
});

describe("알림 설정 (H06)", () => {
  const switchOn = (
    root: Awaited<ReturnType<typeof openSettings>>,
    title: string
  ) =>
    root
      .findAll(
        (n) =>
          typeof n.type === "string" &&
          n.props.accessibilityRole === "switch" &&
          String(n.props.accessibilityLabel).startsWith(title)
      )
      .at(-1)?.props.accessibilityState?.checked;

  test("온보딩에서 고른 알림을 보여 주고, 재연결 제안을 켜서 저장한다", async () => {
    const root = await openSettings();
    await press(root, "알림 설정");
    await waitForText(root, "재연결 제안");

    // 온보딩 06은 6개 모두 켜짐, 재연결 제안은 온보딩에 없어 꺼짐 → 전체 알림도 꺼짐 (시안 첫 화면)
    expect(switchOn(root, "오늘의 상태 확인")).toBe(true);
    expect(switchOn(root, "재연결 제안")).toBe(false);
    expect(switchOn(root, "전체 알림")).toBe(false);

    await pressByRole(
      root,
      "switch",
      "재연결 제안, 오래 연락하지 않은 친구의 안부를 제안해요"
    );
    expect(switchOn(root, "전체 알림")).toBe(true);
    await press(root, "저장하기");
    await waitForText(root, "알림 설정을 저장했어요");
    const saved = JSON.parse((await services.storage.getItem(ONBOARDING_KEY))!);
    expect(saved.notificationPrefs).toContain("RECONNECT");
  });

  test("전체 알림을 끄면 모두 꺼진다", async () => {
    const root = await openSettings();
    await press(root, "알림 설정");
    await waitForText(root, "재연결 제안");
    await pressByRole(root, "switch", "전체 알림");
    await pressByRole(root, "switch", "전체 알림");
    expect(switchOn(root, "오늘의 상태 확인")).toBe(false);
    expect(switchOn(root, "재연결 제안")).toBe(false);
    await press(root, "저장하기");
    await waitForText(root, "알림 설정을 저장했어요");
    const saved = JSON.parse((await services.storage.getItem(ONBOARDING_KEY))!);
    expect(saved.notificationPrefs).toEqual([]);
  });
});

describe("내 상황과 답장 기준 (H05)", () => {
  test("온보딩에서 쓴 AI 메모리를 고쳐 저장한다", async () => {
    const root = await openSettings();
    await press(root, "내 상황과 답장 기준");
    await waitForText(root, "AI 답장 맞춤 설정");

    const input = (label: string) =>
      root
        .findAll(
          (n) =>
            typeof n.type === "string" &&
            !!n.props.onChangeText &&
            n.props.accessibilityLabel === label
        )
        .at(-1)!;
    await ReactTestRenderer.act(async () =>
      input("답장에 사용해도 되는 내 상황").props.onChangeText(
        "취업 준비 중이에요"
      )
    );
    await pressByRole(root, "radio", "가족");
    await press(root, "답장 기준 저장하기");
    await waitForText(root, "답장 기준을 저장했어요!");
    const saved = JSON.parse((await services.storage.getItem(ONBOARDING_KEY))!);
    expect(saved.memory).toEqual({
      status: "취업 준비 중이에요",
      avoid: "",
      avoidTopics: ["가족"],
    });
  });
});

describe("확인할 메신저 앱 (H04)", () => {
  test("온보딩에서 고른 앱을 보여 주고, 바꿔 저장하면 알림을 모을 앱도 바뀐다", async () => {
    const root = await openSettings();
    await press(root, "확인할 메신저 앱");
    await waitForText(root, "도움을 받을 앱을 선택해요");

    const checked = (label: string) =>
      root
        .findAll(
          (n) =>
            typeof n.type === "string" &&
            n.props.accessibilityRole === "checkbox" &&
            n.props.accessibilityLabel === label
        )
        .at(-1)?.props.accessibilityState?.checked;
    expect(checked("카카오톡")).toBe(true);
    expect(checked("인스타그램")).toBe(false);
    expect(checked("전체 선택")).toBe(false);

    await pressByRole(root, "checkbox", "인스타그램");
    expect(checked("전체 선택")).toBe(true);
    await press(root, "저장하기");
    await waitForText(root, "확인할 메신저 앱 설정을 업데이트 했어요");
    const saved = JSON.parse((await services.storage.getItem(ONBOARDING_KEY))!);
    expect(saved.linkedApps.sort()).toEqual(["INSTAGRAM", "KAKAOTALK", "SMS"]);
    expect(await services.collection.getApps()).toContain(
      "com.instagram.android"
    );
  });
});

describe("내 정보 (H02)", () => {
  const openProfile = async () => {
    const root = await openSettings();
    await press(root, "내 정보");
    await waitForText(root, "1997년 02월 12일");
    return root;
  };

  test("정보를 보여 주고, 비밀번호를 확인한 뒤 고쳐 저장한다", async () => {
    const root = await openProfile();
    expect(findText(root, MOCK_DEMO_ACCOUNT.email).length).toBe(1);
    expect(findText(root, "남성").length).toBe(1);

    await press(root, "수정하기");
    await waitForText(root, "정보를 수정하려면\n비밀번호를 입력해주세요");
    await type(root, "비밀번호 입력", "wrong1234");
    await press(root, "입력했어요");
    await waitForText(root, "비밀번호가 일치하지 않아요.");
    expect(findText(root, "비밀번호 재설정").length).toBeGreaterThan(0);

    await type(root, "비밀번호 입력", MOCK_DEMO_ACCOUNT.password);
    await press(root, "입력했어요");
    await waitForText(root, "저장하기");
    await type(root, "이메일 아이디", "hello");
    await pressByRole(root, "radio", "여성");
    await press(root, "저장하기");
    await waitForText(root, "내 정보를 수정했어요");
    await waitForText(root, "hello@malssiat.app");
    expect(findText(root, "여성").length).toBe(1);
  });

  test("현재 비밀번호를 확인해야 새 비밀번호를 정할 수 있고, 바꾸면 내 정보로 돌아온다", async () => {
    const root = await openProfile();
    await pressByRole(root, "button", "비밀번호 재설정");
    await waitForText(root, "현재 비밀번호");

    await type(root, "현재 비밀번호", "wrong1234");
    await pressByRole(root, "button", "현재 비밀번호 확인");
    await waitForText(root, "비밀번호가 일치하지 않아요.");

    await type(root, "현재 비밀번호", MOCK_DEMO_ACCOUNT.password);
    await pressByRole(root, "button", "현재 비밀번호 확인");
    await waitForText(root, "비밀번호를 확인했어요.");

    await type(root, "새 비밀번호", "efgh5678");
    await type(root, "새 비밀번호 확인", "efgh567");
    expect(findText(root, "비밀번호가 일치하지 않아요.").length).toBe(1);
    await type(root, "새 비밀번호 확인", "efgh5678");
    await press(root, "비밀번호 재설정 하기");
    await waitForText(root, "비밀번호가 변경됐어요");
    await waitForText(root, "1997년 02월 12일");

    // 다음 테스트(탈퇴)가 쓰는 비밀번호로 되돌림
    await services.auth.changePassword("efgh5678", MOCK_DEMO_ACCOUNT.password);
  });
});

describe("회원 탈퇴", () => {
  test("확인 팝업에서 계속해서 사용하기를 누르면 닫힌다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await waitForText(root, "계정을 삭제할까요?");
    await press(root, "계속해서 사용하기");
    await waitForNoText(root, "계정을 삭제할까요?");
    expect(findText(root, "회원 탈퇴하기").length).toBe(0);
  });

  test("비밀번호 확인이 다르면 안내만, 같으면 탈퇴하기가 보이고 틀린 비밀번호는 칸에 알려 준다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await press(root, "탈퇴 진행하기");
    await waitForText(root, "회원 탈퇴하기");
    expect(findText(root, "탈퇴하기").length).toBe(0);

    await type(root, "비밀번호", "wrong1234");
    await type(root, "비밀번호 확인", "wrong12");
    expect(findText(root, "비밀번호가 일치하지 않아요.").length).toBe(1);
    expect(findText(root, "탈퇴하기").length).toBe(0);

    await type(root, "비밀번호 확인", "wrong1234");
    expect(findText(root, "비밀번호가 일치해요.").length).toBe(1);
    await press(root, "탈퇴하기");
    await waitForText(root, "비밀번호가 맞지 않아요. 다시 확인해주세요.");

    // 계정은 그대로
    await expect(
      services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password)
    ).resolves.toBeTruthy();
  });

  // mock 계정을 지우므로 이 파일의 마지막 테스트
  test("탈퇴하면 계정과 기기 데이터를 지우고 스플래시로 간다", async () => {
    const root = await openSettings();
    await press(root, "회원 탈퇴");
    await press(root, "탈퇴 진행하기");
    await type(root, "비밀번호", MOCK_DEMO_ACCOUNT.password);
    await type(root, "비밀번호 확인", MOCK_DEMO_ACCOUNT.password);
    await press(root, "탈퇴하기");
    await waitForText(root, "시작하기");

    expect(services.tokens.get()).toBeNull();
    expect(await services.storage.getItem(ONBOARDING_KEY)).toBeNull();
    await expect(
      services.auth.login(MOCK_DEMO_ACCOUNT.loginId, MOCK_DEMO_ACCOUNT.password)
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODE.invalidCredentials });
  });
});
