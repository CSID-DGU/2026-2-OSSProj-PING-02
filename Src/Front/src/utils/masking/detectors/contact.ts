// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape detectors/contact/phone.py, email.py를 TS로 옮겼다.
import { findIter } from "../regex";
import type { Detection, Detector } from "../types";

// ---------------------------------------------------------------------------
// 전화번호 — 휴대폰(01X)·유선(지역번호)·인터넷 전화(070)·평생번호(050X), +82 표기
// ---------------------------------------------------------------------------

// 그룹 사이 구분자: 하이픈/점/공백, en·em dash, "공백-하이픈-공백" 조합까지. 상한이 있어 ReDoS 없음.
const SEP = "[-.\\s–—]{0,3}";
const MOBILE_PREFIX = "(?:\\+82[-.\\s]?0?|0)1[016789]";
const AREA = "(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4]|70|50\\d?)";
const LANDLINE_PREFIX = "0" + AREA;
const TAIL = SEP + "\\d{3,4}" + SEP + "\\d{4}(?!\\d)";

// 파이썬판은 `(\()?국번(?(1)\))` 조건부 참조로 "여는 괄호가 있으면 닫는 괄호도"를 강제한다.
// JS에는 조건부 참조가 없어 "(국번)" | "국번" 두 갈래로 같은 뜻을 낸다.
const parenthesized = (prefix: string) => `(?:\\(${prefix}\\)|${prefix})`;
const MOBILE_RE = new RegExp("(?<!\\d)" + parenthesized(MOBILE_PREFIX) + TAIL);
const LANDLINE_RE = new RegExp(
  "(?<!\\d)" + parenthesized(LANDLINE_PREFIX) + TAIL
);

// 위 두 식이 못 받는 표기: 닫는 괄호만 쓴 국번 "02)555-1234", "+82 (0)10-…", "(+82) 10-…",
// 0을 뺀 유선 "+82-2-555-1234", 0을 그대로 붙인 "+820212345678".
const EXTRA_MOBILE_RE = new RegExp(
  "(?<![\\d(])" +
    MOBILE_PREFIX +
    "\\)" +
    TAIL +
    "|(?<!\\d)\\+82[-.\\s]?\\(0\\)\\s?1[016789]" +
    TAIL +
    "|(?<!\\d)\\(\\+82\\)[-.\\s]?1[016789]" +
    TAIL
);
const EXTRA_LANDLINE_RE = new RegExp(
  "(?<![\\d(])" +
    LANDLINE_PREFIX +
    "\\)" +
    TAIL +
    "|(?<!\\d)\\+82[-.\\s]?(?:\\(0\\)\\s?)?" +
    AREA +
    "\\)?" +
    TAIL +
    "|(?<!\\d)\\+82[-.\\s]?0" +
    AREA +
    TAIL
);

function hasSeparator(s: string): boolean {
  return s.includes("-") || s.includes(".") || s.includes(" ");
}

export class PhoneDetector implements Detector {
  readonly kind = "phone" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    const table: Array<[RegExp, number, number]> = [
      [MOBILE_RE, 1.0, 0.9],
      [LANDLINE_RE, 0.95, 0.8],
      [EXTRA_MOBILE_RE, 1.0, 0.9],
      [EXTRA_LANDLINE_RE, 0.95, 0.8],
    ];
    for (const [re, withSep, bare] of table) {
      for (const m of findIter(re, text)) {
        found.push({
          kind: this.kind,
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          confidence: hasSeparator(m[0]) ? withSep : bare,
          detector: "PhoneDetector",
        });
      }
    }
    return found;
  }
}

// ---------------------------------------------------------------------------
// 이메일 — 로컬 파트는 한글 허용(RFC 6531), 도메인은 영문 라벨.영문 TLD만(“회의@3층” 오탐 방지)
// ---------------------------------------------------------------------------

// 모든 반복에 상한을 둬 ReDoS를 막는다(RFC 5321 한계와 같다).
const EMAIL_RE = new RegExp(
  "[A-Za-z0-9._%+\\-가-힣]{1,64}" +
    "@" +
    "(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.){1,8}" +
    "[A-Za-z]{2,63}"
);

export class EmailDetector implements Detector {
  readonly kind = "email" as const;

  detect(text: string): Detection[] {
    return Array.from(findIter(EMAIL_RE, text), (m) => ({
      kind: this.kind,
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
      confidence: 1.0,
      detector: "EmailDetector",
    }));
  }
}
