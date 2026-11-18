import { maskPii, scanPii, unmaskPii } from "../src/utils/masking";

const kinds = (text: string, names?: string[]) =>
  scanPii(text, { names }).map((d) => [d.kind, d.text]);

describe("규칙 탐지기", () => {
  test("주민등록번호 — 체크섬·가린 뒷자리·날짜 표기", () => {
    expect(kinds("주민번호 800101-1234560 입니다")).toEqual([
      ["rrn", "800101-1234560"],
    ]);
    expect(kinds("주민번호 800101-1******")).toEqual([
      ["rrn", "800101-1******"],
    ]);
    // 앞자리가 없는 날짜(13월)는 주민번호가 아니다
    expect(kinds("코드 801301-1234567")).toEqual([]);
  });

  test("전화번호 — 휴대폰·유선·+82·괄호", () => {
    expect(kinds("내 번호 010-1234-5678 이야")).toEqual([
      ["phone", "010-1234-5678"],
    ]);
    expect(kinds("사무실 02)555-1234")).toEqual([["phone", "02)555-1234"]]);
    expect(kinds("+82 10 1234 5678로 연락줘")).toEqual([
      ["phone", "+82 10 1234 5678"],
    ]);
    expect(kinds("(010) 1234-5678")).toEqual([["phone", "(010) 1234-5678"]]);
    // 연도 괄호는 국번이 아니다
    expect(kinds("(2024) 1234-5678")).toEqual([]);
  });

  test('이메일 — 한글 로컬 파트는 받고 "회의@3층"은 거른다', () => {
    expect(kinds("메일 홍길동@example.com 으로")).toEqual([
      ["email", "홍길동@example.com"],
    ]);
    expect(kinds("회의@3층에서 봐")).toEqual([]);
  });

  test("카드·계좌 — Luhn과 계좌 문맥", () => {
    expect(kinds("카드 4111-1111-1111-1111 결제")).toEqual([
      ["card", "4111-1111-1111-1111"],
    ]);
    expect(kinds("신한 110-123-456789 로 보내줘")).toEqual([
      ["account", "110-123-456789"],
    ]);
    expect(kinds("입금 계좌 1002 123 456789")).toEqual([
      ["account", "1002 123 456789"],
    ]);
    // 문맥 없는 숫자열은 계좌가 아니다
    expect(kinds("우리 가게 주문번호 2026-0925-1234")).toEqual([]);
  });

  test("주소 — 번지·동호까지 넓혀 가린다", () => {
    expect(
      kinds("서울특별시 강남구 테헤란로 123 더샵아파트 101동 1203호로 와")
    ).toEqual([
      ["address", "서울특별시 강남구 테헤란로 123 더샵아파트 101동 1203호"],
    ]);
    expect(kinds("서울 강남구 역삼동 12-3")).toEqual([
      ["address", "서울 강남구 역삼동 12-3"],
    ]);
    // 지역 이름만 쓴 문장은 주소가 아니다
    expect(kinds("서울 사람이라 경기 침체 걱정돼")).toEqual([]);
  });

  test("생년월일 — 단서가 있는 날짜만", () => {
    expect(kinds("생일은 1999년 7월 21일이야")).toEqual([
      ["birth_date", "1999년 7월 21일"],
    ]);
    expect(kinds("92년 7월 3일생이에요")).toEqual([
      ["birth_date", "92년 7월 3일"],
    ]);
    expect(kinds("회의는 2026년 3월 1일")).toEqual([]);
  });

  test("표기 변형 — 전각 숫자·폭 없는 공백·가운뎃점", () => {
    expect(kinds("０１０-１２３４-５６７８")).toEqual([
      ["phone", "０１０-１２３４-５６７８"],
    ]);
    expect(kinds("010​-1234-5678")).toEqual([["phone", "010​-1234-5678"]]);
    expect(kinds("010·1234·5678")).toEqual([["phone", "010·1234·5678"]]);
  });
});

describe("이름 사전", () => {
  test("조사가 붙어도 찾고, 긴 이름을 먼저 맞춘다", () => {
    expect(kinds("김민수가 민수야 하고 불렀어", ["민수", "김민수"])).toEqual([
      ["name", "김민수"],
      ["name", "민수"],
    ]);
  });

  test("영문 아이디는 대소문자를 무시하고 낱말 경계를 본다", () => {
    expect(
      kinds("Minsu_Kim 님이 보냄, xminsu_kim은 아님", ["minsu_kim"])
    ).toEqual([["name", "Minsu_Kim"]]);
  });

  test("한 글자 이름과 빈 목록은 무시한다", () => {
    expect(kinds("김 대리 왔어", ["김", " "])).toEqual([]);
  });
});

describe("maskPii / unmaskPii", () => {
  test("같은 값은 같은 번호, 응답은 기기에서 되돌린다", () => {
    const masked = maskPii(
      "민수야 010-1234-5678 맞지? 민수 번호 010-1234-5678, 집은 02-555-1234",
      {
        names: ["민수"],
      }
    );
    expect(masked.text).toBe(
      "[이름1]야 [전화번호1] 맞지? [이름1] 번호 [전화번호1], 집은 [전화번호2]"
    );
    expect(masked.mapping).toEqual({
      "[이름1]": "민수",
      "[전화번호1]": "010-1234-5678",
      "[전화번호2]": "02-555-1234",
    });
    expect(
      unmaskPii("[이름1]아, [전화번호2]로 전화할게!", masked.mapping)
    ).toBe("민수아, 02-555-1234로 전화할게!");
  });

  test("겹친 탐지는 합쳐서 원문이 남지 않는다", () => {
    const masked = maskPii("서울특별시 강남구 역삼동 800101-1234560");
    expect(masked.text).not.toMatch(/\d{4}/);
  });

  test("개인정보가 없으면 그대로 둔다", () => {
    expect(maskPii("내일 3시에 볼까?")).toEqual({
      text: "내일 3시에 볼까?",
      detections: [],
      mapping: {},
    });
  });
});
