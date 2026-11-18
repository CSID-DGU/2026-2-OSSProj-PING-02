// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape detectors/identity/passport.py, driver_license.py,
// detectors/business/business_registration.py, detectors/personal/birthdate.py를 TS로 옮겼다.
import { findIter, search } from "../regex";
import type { Detection, Detector, PiiKind } from "../types";
import { RRN_BACK_AHEAD, validTwoDigitYearDate } from "./rrn";
import { isValidDate } from "../regex";

const make = (
  kind: PiiKind,
  start: number,
  end: number,
  text: string,
  confidence: number,
  detector: string
): Detection => ({
  kind,
  start,
  end,
  text,
  confidence,
  detector,
});

// ---------------------------------------------------------------------------
// 여권번호 — 구여권 M12345678 / 신여권 M123A4567. 체크섬이 없어 "여권" 문맥으로 확신도를 가른다.
// ---------------------------------------------------------------------------
const PASSPORT_RE =
  /(?<![A-Za-z0-9])[MSROD](?:\d{8}|\d{3}[A-Z]\d{4})(?![A-Za-z0-9])/i;
// "M 12345678", "M-12345678"은 사이즈·문서 코드와 겹쳐 문맥어가 있을 때만 받는다.
const PASSPORT_SPACED_RE =
  /(?<![A-Za-z0-9])[MSROD][ -](?:\d{8}|\d{3}[A-Z]\d{4})(?![A-Za-z0-9])/i;
const PASSPORT_CONTEXT_WINDOW = 15;

const hasPassportCue = (text: string, start: number) =>
  text
    .slice(Math.max(0, start - PASSPORT_CONTEXT_WINDOW), start)
    .includes("여권");

export class PassportDetector implements Detector {
  readonly kind = "passport" as const;

  detect(text: string): Detection[] {
    const spaced = Array.from(findIter(PASSPORT_SPACED_RE, text)).filter((m) =>
      hasPassportCue(text, m.index)
    );
    const all = [...findIter(PASSPORT_RE, text), ...spaced].sort(
      (a, b) => a.index - b.index
    );
    return all.map((m) =>
      make(
        this.kind,
        m.index,
        m.index + m[0].length,
        m[0],
        hasPassportCue(text, m.index) ? 0.9 : 0.6,
        "PassportDetector"
      )
    );
  }
}

// ---------------------------------------------------------------------------
// 운전면허번호 — 지역코드(11~26, 28) + 연도 2 + 일련 6 + 체크·회차 2, 옛 표기 "경기 98-800924-64"
// ---------------------------------------------------------------------------
const REGION = "(?:1[1-9]|2[0-6]|28)";
const DL_RE = new RegExp(
  "(?<![\\d-])" + REGION + "[- ]?\\d{2}[- ]?\\d{6}[- ]?\\d{2}(?![\\d-])"
);
const REGION_NAMES = [
  "서울",
  "부산",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "대구",
  "인천",
  "대전",
  "울산",
];
const DL_NAMED_RE = new RegExp(
  "(?<![가-힣])(?:" +
    REGION_NAMES.join("|") +
    ")(?![가-힣])[ ]{0,2}\\d{2}-\\d{6}-\\d{2}(?!\\d)"
);

export class DriverLicenseDetector implements Detector {
  readonly kind = "driver_license" as const;

  detect(text: string): Detection[] {
    const found = [
      ...findIter(DL_RE, text),
      ...findIter(DL_NAMED_RE, text),
    ].map((m) =>
      make(
        this.kind,
        m.index,
        m.index + m[0].length,
        m[0],
        0.85,
        "DriverLicenseDetector"
      )
    );
    return found.sort((a, b) => a.start - b.start);
  }
}

// ---------------------------------------------------------------------------
// 사업자등록번호 — XXX-XX-XXXXX + 국세청 체크섬. 라벨이 바로 앞이면 체크섬이 틀려도 0.6
// ---------------------------------------------------------------------------
const BRN_RE = /(?<!\d)(\d{3})-(\d{2})-(\d{5})(?!\d)/;
const BRN_LABEL_BEFORE_RE =
  /(?:사업자 ?(?:등록 ?)?번호)[ \t]{0,3}[:：]?[ \t]{0,3}(?:\r?\n)?[ \t]{0,3}[(（]?[ \t]{0,3}$/;
const BRN_LABEL_WINDOW = 20;
const BRN_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5];

function brnChecksumOk(digits: string): boolean {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    total += Number(digits[i]) * BRN_WEIGHTS[i];
  }
  total += Math.floor((Number(digits[8]) * 5) / 10);
  return (10 - (total % 10)) % 10 === Number(digits[9]);
}

export class BusinessRegistrationDetector implements Detector {
  readonly kind = "biz_reg" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    for (const m of findIter(BRN_RE, text)) {
      let confidence: number;
      if (brnChecksumOk(m[1] + m[2] + m[3])) {
        confidence = 1.0;
      } else if (
        search(
          BRN_LABEL_BEFORE_RE,
          text,
          Math.max(0, m.index - BRN_LABEL_WINDOW),
          m.index
        )
      ) {
        confidence = 0.6;
      } else {
        continue;
      }
      found.push(
        make(
          this.kind,
          m.index,
          m.index + m[0].length,
          m[0],
          confidence,
          "BusinessRegistrationDetector"
        )
      );
    }
    return found;
  }
}

// ---------------------------------------------------------------------------
// 생년월일 — "생년월일/생일/출생" 라벨(앞) 또는 "…생/태어나/생일"(뒤) 단서가 있는 날짜만
// ---------------------------------------------------------------------------
const ANCHOR = "(?:출생년월일|생년월일|출생일|생일|출생|생년)";
const DATE =
  "(?:\\d{4}\\s?년\\s?\\d{1,2}\\s?월\\s?\\d{1,2}\\s?일" +
  "|\\d{2}\\s?년\\s?\\d{1,2}\\s?월\\s?\\d{1,2}\\s?일" +
  "|\\d{4}\\s{0,2}[-./]\\s{0,2}\\d{1,2}\\s{0,2}[-./]\\s{0,2}\\d{1,2}(?:\\.(?!\\d))?" +
  "|(?:19|20)\\d{6}(?!" +
  RRN_BACK_AHEAD +
  ")" +
  "|(?!19|20)\\d{8}(?!-?\\d)" +
  "|\\d{2}[-./]\\d{1,2}[-./]\\d{1,2}(?!\\d)" +
  "|\\d{6}(?!\\d|" +
  RRN_BACK_AHEAD +
  "))";
// 날짜 그룹의 시작 위치를 알려고 앞부분을 pre 그룹으로 감싼다(Hermes가 정규식 d 플래그를 지원하지 않음).
const BIRTHDATE_RE = new RegExp(
  "(?<pre>" +
    ANCHOR +
    "(?:\\s{0,3}\\([^()\\d]{1,15}\\)){0,3}[\\s:|]{0,10}(?:은|는|이|가)?\\s{0,5})(?<date>" +
    DATE +
    ")"
);
const TRAILING_CUE =
  "(?:생(?:이에요|이었|이고|이야|이다|이네요|이죠|입니다|으로)?(?![가-힣])" +
  "|에\\s{0,2}태어" +
  "|(?:이|가)?\\s{0,2}(?:제\\s{0,2})?생일" +
  "|\\s?출생(?:입니다|이었|이라|이며|이고|이다|으로|자|인|[은는이가을를의에도만])?(?![가-힣]))";
const BIRTHDATE_TRAILING_RE = new RegExp(
  "(?<date>" + DATE + ")" + TRAILING_CUE
);

function validDate(dateStr: string): boolean {
  let nums = dateStr.match(/\d+/g) ?? [];
  if (nums.length === 1 && (nums[0].length === 6 || nums[0].length === 8)) {
    const c = nums[0];
    nums = [c.slice(0, -4), c.slice(-4, -2), c.slice(-2)];
  }
  if (nums.length !== 3) {
    return false;
  }
  const [y, m, d] = nums.map(Number);
  return nums[0].length === 4
    ? isValidDate(y, m, d)
    : validTwoDigitYearDate(y, m, d);
}

export class BirthDateDetector implements Detector {
  readonly kind = "birth_date" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    const seen = new Set<string>();
    for (const re of [BIRTHDATE_RE, BIRTHDATE_TRAILING_RE]) {
      for (const m of findIter(re, text)) {
        const date = m.groups!.date!;
        const start = m.index + (m.groups!.pre?.length ?? 0);
        const key = `${start}:${start + date.length}`;
        if (seen.has(key) || !validDate(date)) {
          continue;
        }
        seen.add(key);
        found.push(
          make(
            this.kind,
            start,
            start + date.length,
            date,
            0.9,
            "BirthDateDetector"
          )
        );
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }
}
