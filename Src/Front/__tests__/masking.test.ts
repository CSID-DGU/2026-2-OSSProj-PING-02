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

  test("주소 — 층·호 뒤 대화체 어미도 받는다", () => {
    expect(
      kinds("주소는 서울특별시 마포구 월드컵로 212 상암아이파크 102동 1503호야")
    ).toEqual([
      ["address", "서울특별시 마포구 월드컵로 212 상암아이파크 102동 1503호"],
    ]);
    expect(kinds("한빛아파트 101동 302호요")).toEqual([
      ["address", "한빛아파트 101동 302호"],
    ]);
    // 목록에 없는 글자가 붙은 낱말("2호점")은 호가 아니다
    expect(kinds("서울 강남구 테헤란로 123 2호점에서 봐")).toEqual([
      ["address", "서울 강남구 테헤란로 123"],
    ]);
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

describe("링크", () => {
  test("스킴이 있는 주소와 도메인+경로 주소를 가린다", () => {
    expect(kinds("회비는 https://toss.me/minsu123/30000 여기로!")).toEqual([
      ["url", "https://toss.me/minsu123/30000"],
    ]);
    expect(kinds("오픈채팅 open.kakao.com/o/gAbCdEf 들어와")).toEqual([
      ["url", "open.kakao.com/o/gAbCdEf"],
    ]);
    expect(kinds("kakaotalk://join/abc 이걸로")).toEqual([
      ["url", "kakaotalk://join/abc"],
    ]);
  });

  test("뒤에 붙은 조사·문장부호·괄호는 링크에서 뺀다", () => {
    expect(kinds("사진 https://photos.app.goo.gl/AbC123에서 봐")).toEqual([
      ["url", "https://photos.app.goo.gl/AbC123"],
    ]);
    expect(kinds("링크: www.example.co.kr/e?id=88.")).toEqual([
      ["url", "www.example.co.kr/e?id=88"],
    ]);
    expect(kinds("지도 naver.me/5xYz (위치)")).toEqual([
      ["url", "naver.me/5xYz"],
    ]);
  });

  test("링크 안의 번호는 링크 하나로 합쳐 가린다", () => {
    const masked = maskPii("https://ex.com/u?phone=010-1234-5678 확인");
    expect(masked.text).toBe("[링크1] 확인");
  });

  test("경로 없는 사이트 이름·이메일·숫자 표기는 링크가 아니다", () => {
    expect(kinds("홈페이지는 example.com 이야")).toEqual([]);
    expect(kinds("메일 minsu@example.com")).toEqual([
      ["email", "minsu@example.com"],
    ]);
    expect(kinds("평점 3.5/10, 1.2배")).toEqual([]);
  });
});

describe("계좌·운전면허 구분", () => {
  test("신한 110으로 시작하는 12자리는 계좌로 정리된다", () => {
    expect(kinds("신한 110123456789 로 보내줘")).toEqual([
      ["account", "110123456789"],
    ]);
    expect(kinds("신한 110-123-456789")).toEqual([
      ["account", "110-123-456789"],
    ]);
  });

  test("면허 단서가 있으면 운전면허로 남는다", () => {
    expect(kinds("면허번호 112345678901")).toEqual([
      ["driver_license", "112345678901"],
    ]);
    expect(kinds("운전면허 11-23-456789-01")).toEqual([
      ["driver_license", "11-23-456789-01"],
    ]);
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
    ).toBe("민수야, 02-555-1234로 전화할게!");
  });

  test("되돌릴 때 조사를 받침에 맞게 고친다", () => {
    const mapping = {
      "[이름1]": "민수",
      "[이름2]": "지은",
      "[주소1]": "서울 강남구 역삼동",
      "[주소2]": "부산 해운대구 센텀2로 25",
    };
    expect(
      unmaskPii(
        "[이름2]야, [이름1]이 [이름2]을 찾았어. [이름1]과 [주소1]로 가자",
        mapping
      )
    ).toBe("지은아, 민수가 지은을 찾았어. 민수와 서울 강남구 역삼동으로 가자");
    // 받침을 알 수 없는 값(숫자 끝)과 조사 뒤에 말이 이어지는 경우는 그대로 둔다
    expect(unmaskPii("[주소2]으로 와. [이름2]이는 어때?", mapping)).toBe(
      "부산 해운대구 센텀2로 25으로 와. 지은이는 어때?"
    );
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
