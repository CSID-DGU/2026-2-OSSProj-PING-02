import { useState } from "react";
import { DeviceEventEmitter, Keyboard } from "react-native";
import ReactTestRenderer from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MalssiatProvider } from "../src/core";
import { BottomSheet, BottomSheetActions } from "../src/core/ui/sheet";
import { ToastProvider, useToast } from "../src/core/ui/toast";
import { Switch, SwitchRow } from "../src/core/ui/switch";
import { UnderlineTabs } from "../src/core/ui/tabs";
import { TextArea } from "../src/core/ui/field";
import {
  Calendar,
  DateTimeSheet,
  formatDateTime,
  formatTime,
} from "../src/core/ui/calendar";
import { Dialog } from "../src/core/ui/dialog";
import { TextField } from "../src/core/ui/field";
import { Toast as ToastView } from "../src/core/ui/toast";
import { findText, press, pressByRole } from "../test-utils/app";

// 공통 컴포넌트(시트·토스트·스위치·밑줄 탭·달력) 동작·접근성 테스트
const render = async (node: React.ReactNode) => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <MalssiatProvider>
          <ToastProvider>{node}</ToastProvider>
        </MalssiatProvider>
      </SafeAreaProvider>
    );
  });
  return renderer;
};

const byRole = (root: ReactTestRenderer.ReactTestInstance, role: string) =>
  root.findAll(
    n => typeof n.type === "string" && n.props.accessibilityRole === role
  );

describe("BottomSheet", () => {
  const Sheet = ({ onClose }: { onClose: () => void }) => (
    <BottomSheet
      visible
      onClose={onClose}
      title="언제 다시 알려드릴까요?"
      footer={
        <BottomSheetActions
          confirmLabel="내일 다시 알려주기"
          onConfirm={() => {}}
          onCancel={onClose}
        />
      }
    />
  );

  test("안드로이드 뒤로가기·딤·취소로 닫힌다", async () => {
    const onClose = jest.fn();
    const { root, unmount } = await render(<Sheet onClose={onClose} />);
    expect(findText(root, "언제 다시 알려드릴까요?").length).toBe(1);

    // Modal의 onRequestClose = 안드로이드 뒤로가기
    const modal = root.findAll(n => n.props.onRequestClose).at(0);
    await ReactTestRenderer.act(async () => modal!.props.onRequestClose());
    await pressByRole(root, "button", "닫기");
    await press(root, "취소");
    expect(onClose).toHaveBeenCalledTimes(3);
    unmount();
  });
});

describe("Toast", () => {
  test("show로 띄우고 시간이 지나면 사라진다", async () => {
    jest.useFakeTimers();
    let show!: ReturnType<typeof useToast>["show"];
    const Probe = () => {
      show = useToast().show;
      return null;
    };
    const { root, unmount } = await render(<Probe />);
    await ReactTestRenderer.act(async () => show("붙여넣기 성공!"));
    expect(findText(root, "붙여넣기 성공!").length).toBe(1);
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(findText(root, "붙여넣기 성공!").length).toBe(0);
    unmount();
    jest.useRealTimers();
  });
});

describe("Switch", () => {
  test("줄 전체를 눌러 켜고 끄며 상태를 알린다", async () => {
    const Row = () => {
      const [on, setOn] = useState(true);
      return (
        <>
          <SwitchRow
            label="이 계정의 연락 분석"
            description="이 계정에서 오는 알림을 분석해요"
            value={on}
            onValueChange={setOn}
          />
          <Switch value={on} onValueChange={setOn} accessibilityLabel="단독" />
        </>
      );
    };
    const { root, unmount } = await render(<Row />);
    const states = () =>
      byRole(root, "switch").map(n => n.props.accessibilityState.checked);
    expect(states()).toEqual([true, true]);
    await pressByRole(root, "switch", "이 계정의 연락 분석");
    expect(states()).toEqual([false, false]);
    await pressByRole(root, "switch", "단독");
    expect(states()).toEqual([true, true]);
    unmount();
  });
});

describe("TextArea", () => {
  test("입력하면 글자 수가 바뀌고, 최대 글자 수를 넘지 않으며, showInput=false면 입력칸이 없다", async () => {
    const Area = () => {
      const [text, setText] = useState("");
      return (
        <>
          <TextArea
            label="답장에 사용해도 되는 내 상황"
            value={text}
            onChangeText={setText}
            maxLength={10}
          />
          <TextArea label="칩만" maxLength={500} showInput={false} />
        </>
      );
    };
    const { root, unmount } = await render(<Area />);
    const inputs = () =>
      root.findAll(n => typeof n.type === "string" && !!n.props.onChangeText);
    expect(inputs()).toHaveLength(1);
    expect(inputs()[0].props.maxLength).toBe(10);
    expect(inputs()[0].props.accessibilityLabel).toBe("답장에 사용해도 되는 내 상황");
    expect(findText(root, "0/10").length).toBe(1);
    await ReactTestRenderer.act(async () =>
      inputs()[0].props.onChangeText("시험 준비 중")
    );
    expect(findText(root, "7/10").length).toBe(1);
    expect(findText(root, "0/500").length).toBe(1);
    unmount();
  });
});

describe("UnderlineTabs", () => {
  test("탭을 누르면 선택이 바뀐다 (스크롤 모드 포함)", async () => {
    const Tabs = ({ scrollable }: { scrollable?: boolean }) => {
      const [tab, setTab] = useState<"all" | "new">("all");
      return (
        <UnderlineTabs
          scrollable={scrollable}
          tabs={[
            { key: "all", label: "전체" },
            { key: "new", label: "NEW", accessibilityLabel: "새 친구" },
          ]}
          value={tab}
          onChange={setTab}
        />
      );
    };
    for (const scrollable of [false, true]) {
      const { root, unmount } = await render(<Tabs scrollable={scrollable} />);
      expect(byRole(root, "tablist").length).toBe(1);
      await pressByRole(root, "tab", "새 친구");
      const selected = byRole(root, "tab").map(
        n => n.props.accessibilityState.selected
      );
      expect(selected).toEqual([false, true]);
      unmount();
    }
  });
});

// 실제 오늘이 시험 날짜와 겹치면 날짜 라벨에 ", 오늘"이 붙으므로 오늘을 고정 (Date만 가짜로)
// (Calendar·DateTimeSheet 공통. 고정하지 않으면 그 날짜에만 테스트가 실패함)
const fixToday = () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date(2026, 0, 15),
      doNotFake: [
        "hrtime",
        "nextTick",
        "performance",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
        "setImmediate",
        "clearImmediate",
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
      ],
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  });
};

describe("Calendar", () => {
  fixToday();

  test("날짜를 고르고 달을 넘기며, 범위 밖 날짜는 누를 수 없다", async () => {
    const onChange = jest.fn();
    const { root, unmount } = await render(
      <Calendar
        initialMonth={new Date(2026, 10, 1)}
        value={new Date(2026, 10, 25)}
        onChange={onChange}
        minDate={new Date(2026, 10, 10)}
      />
    );
    expect(findText(root, "2026년 11월").length).toBe(1);
    const day = (label: string) =>
      byRole(root, "button").find(n => n.props.accessibilityLabel === label)!;
    expect(day("2026년 11월 25일 수요일").props.accessibilityState).toMatchObject(
      { selected: true }
    );
    expect(day("2026년 11월 9일 월요일").props.accessibilityState).toMatchObject(
      { disabled: true }
    );
    // 이전 달은 최소 날짜보다 앞이라 막힘
    expect(day("이전 달").props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await pressByRole(root, "button", "2026년 11월 29일 일요일");
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 10, 29));

    await pressByRole(root, "button", "다음 달");
    expect(findText(root, "2026년 12월").length).toBe(1);
    unmount();
  });

  test("시간 표기", () => {
    expect(formatTime(13 * 60)).toBe("오후 1시");
    expect(formatTime(0)).toBe("오전 12시");
    expect(formatTime(9 * 60 + 30)).toBe("오전 9시 30분");
    expect(formatDateTime(new Date(2026, 10, 29, 13))).toBe(
      "11월 29일 일요일 오후 1시"
    );
  });
});

describe("DateTimeSheet", () => {
  fixToday();

  test("날짜와 시간 칩을 고르면 확인 버튼 문구에 반영된다", async () => {
    const onConfirm = jest.fn();
    const { root, unmount } = await render(
      <DateTimeSheet
        visible
        onClose={() => {}}
        onConfirm={onConfirm}
        initialValue={new Date(2026, 10, 25, 18)}
        timePresets={[9 * 60, 18 * 60]}
        confirmLabel={d => `${formatDateTime(d)}에 다시 알려주기`}
      />
    );
    expect(findText(root, "11월 25일 수요일 오후 6시에 다시 알려주기").length).toBe(1);
    await pressByRole(root, "radio", "오전 9시");
    await pressByRole(root, "button", "2026년 11월 27일 금요일");
    await press(root, "11월 27일 금요일 오전 9시에 다시 알려주기");
    expect(onConfirm).toHaveBeenCalledWith(new Date(2026, 10, 27, 9));
    unmount();
  });

  test("처음 값이 없으면 날짜를 고르기 전까지 확인할 수 없다", async () => {
    const { root, unmount } = await render(
      <DateTimeSheet visible onClose={() => {}} onConfirm={() => {}} />
    );
    const confirm = byRole(root, "button").find(
      n => findText(n, "날짜와 시간을 골라 주세요").length > 0
    );
    expect(confirm?.props.accessibilityState).toMatchObject({ disabled: true });
    unmount();
  });
});

// 뒤로가기 이벤트가 다른 테스트에 남지 않도록
afterAll(() => DeviceEventEmitter.removeAllListeners("hardwareBackPress"));

// #60 설정에서 추가한 모양: 오류 토스트, 닫기(X) 팝업, 입력창 성공 상태
describe("#60 공통 컴포넌트 추가", () => {
  test("오류 토스트는 같은 문구를 알림으로 읽어 준다", async () => {
    const renderer = await render(
      <ToastView message="저장하지 못했어요." icon="error" />
    );
    const alert = byRole(renderer.root, "alert")[0];
    expect(findText(alert, "저장하지 못했어요.").length).toBe(1);
  });

  test("닫기(X)는 onDismiss, 아래 글자 버튼은 onClose", async () => {
    const onClose = jest.fn();
    const onDismiss = jest.fn();
    const renderer = await render(
      <Dialog
        visible
        icon={null}
        showCloseIcon
        title="계정을 삭제할까요?"
        confirmLabel="계속해서 사용하기"
        onConfirm={() => {}}
        closeLabel="탈퇴 진행하기"
        onClose={onClose}
        onDismiss={onDismiss}
      />
    );
    await pressByRole(renderer.root, "button", "닫기");
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await press(renderer.root, "탈퇴 진행하기");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("성공 문구는 도움말 자리에 보이고, 오류가 있으면 오류가 먼저", async () => {
    const renderer = await render(
      <>
        <TextField label="확인" success="비밀번호가 일치해요." />
        <TextField label="확인2" success="일치" error="일치하지 않아요." />
      </>
    );
    expect(findText(renderer.root, "비밀번호가 일치해요.").length).toBe(1);
    expect(findText(renderer.root, "일치").length).toBe(0);
    expect(findText(renderer.root, "일치하지 않아요.").length).toBe(1);
  });
});

describe("BottomSheet 키보드", () => {
  test("키보드가 올라오면 그 높이만큼 시트를 올리고, 내려가면 되돌린다", async () => {
    // jest의 Keyboard는 mock이라 등록한 함수를 직접 부름
    const handlers: Record<string, (e: unknown) => void> = {};
    const spy = jest
      .spyOn(Keyboard, "addListener")
      .mockImplementation((event: string, fn: (e: never) => void) => {
        handlers[event] = fn as (e: unknown) => void;
        return { remove: () => {} } as ReturnType<typeof Keyboard.addListener>;
      });
    const renderer = await render(
      <BottomSheet visible onClose={() => {}} testID="kb-sheet" />
    );
    // 시트를 아래로 붙이는 바깥 틀(justify-content: flex-end)의 아래 여백
    const bottomOf = () => {
      const flat = (style: unknown) =>
        Object.assign({}, ...[style].flat(10).filter(Boolean));
      const container = renderer.root
        .findAll(n => typeof n.type === "string")
        .find(n => flat(n.props.style).justifyContent === "flex-end");
      return flat(container!.props.style).paddingBottom ?? 0;
    };
    expect(bottomOf()).toBe(0);
    await ReactTestRenderer.act(async () => {
      handlers.keyboardDidShow({ endCoordinates: { height: 300 } });
    });
    expect(bottomOf()).toBeGreaterThanOrEqual(300);
    await ReactTestRenderer.act(async () => {
      handlers.keyboardDidHide({});
    });
    expect(bottomOf()).toBe(0);
    spy.mockRestore();
  });
});
