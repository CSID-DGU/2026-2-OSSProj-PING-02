// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape detectors/financial/creditcard.py, account.py를 TS로 옮겼다.
import {
  digitsOnly,
  escapeRegex,
  findIter,
  fullMatch,
  matchAt,
  search,
  searchEveryStart,
} from "../regex";
import type { Detection, Detector } from "../types";

// ---------------------------------------------------------------------------
// 신용카드 — 4자리 그룹 구조 정규식 + Luhn 체크섬
// ---------------------------------------------------------------------------

// 카드는 4자리 그룹으로 시작한다(앞의 무관한 숫자를 삼키지 않고, 주민번호 6-7 표기도 자연히 배제).
// 구분자는 하나로 일관돼야 한다(역참조 \1). 모양마다 따로 찾는다.
const CARD_SHAPES = [
  "\\d{4}([ .-]{1,3})\\d{4}\\1\\d{4}\\1\\d{1,4}", // 4-4-4-4 (16자리)
  "\\d{4}([ .-]{1,3})\\d{6}\\1\\d{5}", // 4-6-5 (Amex 15자리)
  "\\d{13,19}", // 붙여 쓴 13~19자리
  "\\d{4}([ .-]{1,3})\\d{4}\\1\\d{4}\\1\\d{4}\\1\\d{1,3}", // 4-4-4-4-3 (17~19자리)
  "\\d{4}([ .-]{1,3})\\d{6}\\1\\d{4}", // 4-6-4 (Diners 14자리)
];
const CARD_RES = CARD_SHAPES.map(
  (shape) => new RegExp("(?<!\\d)(?:" + shape + ")(?!\\d)")
);
// 하이픈·공백을 섞어 쓴 16자리. 연도 목록과 모양이 같아 카드 문맥이 있을 때만 받는다.
const MIXED_CARD_RE =
  /(?<!\d)\d{4}[ -]{1,3}\d{4}[ -]{1,3}\d{4}[ -]{1,3}\d{4}(?!\d)/;
const CARD_CUE_RE = /카드|card|결제/i;
const CARD_CUE_WINDOW = 15;
// 카드 종류 라벨이 번호 바로 앞에 있으면 Luhn이 틀려도 받는다(옮겨 적다 틀린 번호).
const CARD_LABEL_BEFORE_RE =
  /(?:신용카드|체크카드|법인카드|카드 ?번호)[ \t]{0,3}[:：]?[ \t]{0,3}(?:\r?\n)?[ \t]{0,3}[(（]?[ \t]{0,3}$/;
const CARD_LABEL_WINDOW = 20;
const LABELED_CONFIDENCE = 0.6;
const ADJACENT_GAP_RE = /[ ,/]{1,3}/;
const YEAR_LIST_RE = /(?:19|20)\d\d(?:[ -]{1,3}(?:19|20)\d\d){3}/;

export function luhnOk(digits: string): boolean {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let v = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      v *= 2;
      if (v > 9) {
        v -= 9;
      }
    }
    total += v;
  }
  return total % 10 === 0;
}

export class CreditCardDetector implements Detector {
  readonly kind = "card" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    const seen = new Set<string>();
    const matches: Array<[RegExpExecArray, boolean]> = [];
    for (const re of CARD_RES) {
      for (const m of searchEveryStart(re, text)) {
        matches.push([m, false]);
      }
    }
    for (const m of searchEveryStart(MIXED_CARD_RE, text)) {
      matches.push([m, true]);
    }
    matches.sort(
      ([a], [b]) =>
        a.index - b.index || a.index + a[0].length - (b.index + b[0].length)
    );
    for (const [m, mixed] of matches) {
      const start = m.index;
      const end = start + m[0].length;
      const digits = digitsOnly(m[0]);
      const span = `${start}:${end}`;
      if (digits.length < 13 || digits.length > 19 || seen.has(span)) {
        continue;
      }
      let confidence: number;
      if (luhnOk(digits)) {
        if (mixed && !this.hasCardContext(text, m, found)) {
          continue;
        }
        confidence = 0.95;
      } else if (
        search(
          CARD_LABEL_BEFORE_RE,
          text,
          Math.max(0, start - CARD_LABEL_WINDOW),
          start
        )
      ) {
        confidence = LABELED_CONFIDENCE;
      } else {
        continue;
      }
      seen.add(span);
      found.push({
        kind: this.kind,
        start,
        end,
        text: m[0],
        confidence,
        detector: "CreditCardDetector",
      });
    }
    return found;
  }

  private hasCardContext(
    text: string,
    m: RegExpExecArray,
    found: Detection[]
  ): boolean {
    const start = m.index;
    if (
      search(CARD_CUE_RE, text, Math.max(0, start - CARD_CUE_WINDOW), start)
    ) {
      return true;
    }
    if (fullMatch(YEAR_LIST_RE, m[0])) {
      return false;
    }
    return found.some(
      (d) => d.end <= start && fullMatch(ADJACENT_GAP_RE, text, d.end, start)
    );
  }
}

// ---------------------------------------------------------------------------
// 계좌번호 — 체크섬이 없어 문맥(계좌 관련어·은행 이름)이 반드시 있어야 한다
// ---------------------------------------------------------------------------

// 하이픈 그룹 2~4개(마지막 그룹만 한 자리 허용) 또는 붙여 쓴 10~14자리.
const ACCOUNT_RE =
  /(?<!\d)(?<![A-Za-z0-9]-)(?:\d{2,7}(?:-\d{2,7}){0,2}-\d{1,7}|\d{10,14})(?!\d)(?!-[A-Za-z0-9])/;

const ALL_CUES = [
  "계좌",
  "입금",
  "이체",
  "예금주",
  "예금",
  "출금",
  "송금",
  "은행",
  "뱅크",
  "통장",
];
const CUE_WINDOW = 15;

const BANK_NAMES_NEARBY = ["신한", "카뱅", "케뱅", "SC제일"];
const BANK_NAMES_LOCAL = ["농협", "축협", "수협", "신협"];
const BANK_NAMES_LONG = ["새마을금고", "산림조합"];
const NOT_BANK_AFTER: Record<string, string[]> = {
  신한: ["국", "류", "옥", "일"],
  신협: ["약", "정", "력", "상", "업", "의체"],
};
const LOOKAHEAD_SLACK = Math.max(
  ...Object.values(NOT_BANK_AFTER)
    .flat()
    .map((s) => s.length)
);
const BANK_NAMES_ADJACENT = [
  "우리",
  "하나",
  "국민",
  "기업",
  "산업",
  "씨티",
  "우체국",
  "토스",
  "카카오",
  "새마을",
  "부산",
  "경남",
  "광주",
  "전북",
  "제주",
  "대구",
];
const BANK_NAMES_ADJACENT_LATIN = ["KB", "NH", "IBK", "KDB"];

function alternation(names: string[]): string {
  return [...names]
    .sort((a, b) => b.length - a.length)
    .map((name) => {
      let part = escapeRegex(name);
      if (NOT_BANK_AFTER[name]) {
        part += "(?!" + NOT_BANK_AFTER[name].join("|") + ")";
      }
      return part;
    })
    .join("|");
}

const BANK_NEARBY_RE = new RegExp(
  "(?<![가-힣])(?:" +
    alternation([...BANK_NAMES_NEARBY, ...BANK_NAMES_LOCAL]) +
    ")" +
    "|(?<=[가-힣])(?:" +
    alternation(BANK_NAMES_LOCAL) +
    ")(?![가-힣])" +
    "|(?:" +
    alternation(BANK_NAMES_LONG) +
    ")"
);
const BANK_ADJACENT =
  "(?:(?<![가-힣])(?:" +
  alternation(BANK_NAMES_ADJACENT) +
  ")" +
  "|(?<![A-Za-z0-9])(?:" +
  alternation(BANK_NAMES_ADJACENT_LATIN) +
  "))";
const BANK_BEFORE_RE = new RegExp(
  BANK_ADJACENT + "[ \\t\\u00a0:：()\\[\\]/-]{0,4}$"
);
const BANK_AFTER_RE = new RegExp(
  "[ \\t\\u00a0]{0,3}[(\\[][ \\t\\u00a0]{0,3}" +
    BANK_ADJACENT +
    "[ \\t\\u00a0]{0,3}[)\\]]"
);
const BANK_BEFORE_REACH =
  Math.max(
    ...[...BANK_NAMES_ADJACENT, ...BANK_NAMES_ADJACENT_LATIN].map(
      (s) => s.length
    )
  ) + 4;

function hasBankNameCue(text: string, start: number, end: number): boolean {
  const limit = end + CUE_WINDOW;
  for (const m of findIter(
    BANK_NEARBY_RE,
    text,
    Math.max(0, start - CUE_WINDOW),
    limit + LOOKAHEAD_SLACK
  )) {
    if (m.index + m[0].length <= limit) {
      return true;
    }
  }
  if (
    search(BANK_BEFORE_RE, text, Math.max(0, start - BANK_BEFORE_REACH), start)
  ) {
    return true;
  }
  return matchAt(BANK_AFTER_RE, text, end) !== null;
}

function hasAccountContext(text: string, start: number, end: number): boolean {
  const context = text.slice(Math.max(0, start - CUE_WINDOW), end + CUE_WINDOW);
  return (
    ALL_CUES.some((cue) => context.includes(cue)) ||
    hasBankNameCue(text, start, end)
  );
}

// 공백·점 등으로 묶음을 나눈 표기("1002 123 456789", "110.123.456789")는 숫자 묶음을 한 번 훑어 찾는다.
const SPACE_CHARS = " \\t\\u00a0\\u3000";
const WS = "[" + SPACE_CHARS + "]";
const DOTS = "[.\\uff0e]";
const SEPARATOR_RE = new RegExp(
  WS +
    "{1,3}|" +
    WS +
    "{0,2}" +
    DOTS +
    WS +
    "{0,2}|" +
    WS +
    "{1,2}-" +
    WS +
    "{1,2}"
);
const MAX_SEPARATOR_LEN = 5;
const DIGIT_GROUP_RE = /\d+/;
const MAX_GROUP_DIGITS = 7;

type SepKind = "dash" | "dot" | "space";

function separatorKind(gap: string): SepKind | null {
  if (gap.length > MAX_SEPARATOR_LEN || !fullMatch(SEPARATOR_RE, gap)) {
    return null;
  }
  if (gap.includes("-")) {
    return "dash";
  }
  if (gap.includes(".") || gap.includes("．")) {
    return "dot";
  }
  return "space";
}

function looksLikeDateOrIp(
  text: string,
  window: Array<[number, number]>,
  kind: SepKind
): boolean {
  const nums = window.map(([s, e]) => text.slice(s, e));
  if (
    nums.length >= 3 &&
    nums[0].length === 4 &&
    nums[1].length === 2 &&
    nums[2].length === 2
  ) {
    const [y, mo, d] = [+nums[0], +nums[1], +nums[2]];
    if (y >= 1900 && y <= 2099 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return true;
    }
  }
  return (
    kind === "dot" &&
    nums.length === 4 &&
    nums.every((n) => n.length <= 3 && +n <= 255)
  );
}

function chainWindows(
  text: string,
  chain: Array<[number, number]>,
  kinds: SepKind[]
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < chain.length; i++) {
    const minGroups = i + 1 < chain.length && kinds[i] === "space" ? 2 : 3;
    let total = chain[i][1] - chain[i][0];
    for (let j = i + 1; j < Math.min(i + 4, chain.length); j++) {
      if (kinds[j - 1] !== kinds[i] || chain[j - 1][1] - chain[j - 1][0] < 2) {
        break;
      }
      total += chain[j][1] - chain[j][0];
      if (total > 14) {
        break;
      }
      const window = chain.slice(i, j + 1);
      if (
        total >= 10 &&
        window.length >= minGroups &&
        !looksLikeDateOrIp(text, window, kinds[i])
      ) {
        out.push([chain[i][0], chain[j][1]]);
      }
    }
  }
  return out;
}

function separatedWindows(
  text: string
): Array<[number, number, number, number]> {
  const groups = Array.from(
    findIter(DIGIT_GROUP_RE, text),
    (m) => [m.index, m.index + m[0].length] as [number, number]
  );
  const windows: Array<[number, number, number, number]> = [];
  let chain: Array<[number, number]> = [];
  let kinds: SepKind[] = [];
  const closeChain = () => {
    if (chain.length) {
      const spanStart = chain[0][0];
      const spanEnd = chain[chain.length - 1][1];
      for (const [s, e] of chainWindows(text, chain, kinds)) {
        windows.push([s, e, spanStart, spanEnd]);
      }
    }
  };
  groups.forEach(([start, end], idx) => {
    const joinedBefore =
      idx > 0 && groups[idx - 1][1] === start - 1 && text[start - 1] === "-";
    const joinedAfter =
      idx + 1 < groups.length &&
      groups[idx + 1][0] === end + 1 &&
      text[end] === "-";
    if (joinedBefore || joinedAfter || end - start > MAX_GROUP_DIGITS) {
      closeChain();
      chain = [];
      kinds = [];
      return;
    }
    if (chain.length) {
      const kind = separatorKind(text.slice(chain[chain.length - 1][1], start));
      if (kind === null) {
        closeChain();
        chain = [];
        kinds = [];
      } else {
        kinds.push(kind);
      }
    }
    chain.push([start, end]);
  });
  closeChain();
  return windows;
}

export class AccountDetector implements Detector {
  readonly kind = "account" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    for (const m of findIter(ACCOUNT_RE, text)) {
      const len = digitsOnly(m[0]).length;
      if (len < 10 || len > 14) {
        continue;
      }
      if (!hasAccountContext(text, m.index, m.index + m[0].length)) {
        continue;
      }
      found.push(this.make(text, m.index, m.index + m[0].length));
    }

    const chainContext = new Map<string, boolean>();
    const kept: Array<[number, number]> = [];
    for (const [start, end, cs, ce] of separatedWindows(text)) {
      if (!hasAccountContext(text, start, end)) {
        const key = `${cs}:${ce}`;
        if (!chainContext.has(key)) {
          chainContext.set(key, hasAccountContext(text, cs, ce));
        }
        if (!chainContext.get(key)) {
          continue;
        }
      }
      kept.push([start, end]);
    }
    kept.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged: Array<[number, number]> = [];
    for (const [s, e] of kept) {
      const last = merged[merged.length - 1];
      if (last && s < last[1]) {
        last[1] = Math.max(last[1], e);
      } else {
        merged.push([s, e]);
      }
    }
    for (const [s, e] of merged) {
      found.push(this.make(text, s, e));
    }
    return found.sort((a, b) => a.start - b.start);
  }

  private make(text: string, start: number, end: number): Detection {
    return {
      kind: this.kind,
      start,
      end,
      text: text.slice(start, end),
      confidence: 0.6,
      detector: "AccountDetector",
    };
  }
}
