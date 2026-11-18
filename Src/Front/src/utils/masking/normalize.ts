// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape packages/core/maskingtape/normalize.py를 TS로 옮겼다.
/**
 * 탐지 전에 입력 표기를 정리하고, 정리한 위치를 원문 위치로 되돌린다.
 *
 * 눈에 같은 글자라도 다른 코드로 들어오면 규칙이 놓친다. 전각 숫자(８００１０１), 폭 없는 공백이
 * 끼인 번호, 빼기 기호(−)나 en-dash로 나눈 번호, 자모로 분해된 한글이 그렇다. 탐지는 정리한
 * 문자열에서도 하고, 가리는 위치는 원문 기준으로 되돌린다. 원문은 바꾸지 않는다.
 *
 * 파이썬판과 다른 점: 자모 합치기는 NFC 대신 한글 음절 조합 공식으로 직접 한다(Hermes의
 * String.prototype.normalize 지원에 기대지 않으려고). 이 모듈이 합치는 조각은 기본 글자 + 한글
 * 자모(+ 지운 문자)뿐이라 결과가 NFC와 같다.
 */
import type { Detection } from "./types";

const DASHES = "‐‑‒–—―−﹘﹣－ㅡ⁃˗ー─";
const SPACE_CHARS = new Set<number>([
  0x00a0,
  0x1680,
  0x202f,
  0x205f,
  0x3000,
  0x2800,
  0x3164,
  0xffa0,
  ...Array.from({ length: 0x200a - 0x2000 + 1 }, (_, i) => 0x2000 + i),
]);
const DASH_SET = new Set(Array.from(DASHES, (c) => c.charCodeAt(0)));

/** 지우는 문자: 보이지 않는 서식 문자·변형 선택자·태그 문자, 라틴·기호용 결합 부호. */
const DROP_RANGES: Array<[number, number]> = [
  [0x00ad, 0x00ad],
  [0x061c, 0x061c],
  [0x115f, 0x1160],
  [0x180b, 0x180f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0x20d0, 0x20ff],
  [0xfe20, 0xfe2f],
  [0x1bca0, 0x1bca3],
  [0x1d173, 0x1d17a],
  [0xe0000, 0xe0fff],
];
const JAMO_RANGES: Array<[number, number]> = [
  [0x1100, 0x11ff],
  [0xa960, 0xa97f],
  [0xd7b0, 0xd7ff],
];
/** 글자 자체가 바뀌는 정리(자모 합치기, 라틴 결합 부호 지우기)인지 */
const LETTER_CHANGE_RANGES: Array<[number, number]> = [
  ...JAMO_RANGES,
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x1dc0, 0x1dff],
  [0xfe20, 0xfe2f],
];
/** 유니코드 십진 숫자(Nd) 블록의 0 위치(BMP, ASCII 제외). 각 블록은 0~9 열 글자다. */
const DIGIT_ZEROS = [
  0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6,
  0xd66, 0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946,
  0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0,
  0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10,
];

/** 숫자 사이에서 하이픈으로 읽는 점 닮은꼴(가운뎃점 등, maskingtape #636). */
const DIGIT_DOTS = "··ㆍ‧・･•∙⋅․﹒⦁●¸˙" + "ᆞ◦。⸱ꞏ°";
const DIGIT_DOT_RE = new RegExp(
  `(?:(?<=[0-9])|(?<=[0-9][ \\t]))[${DIGIT_DOTS}](?=[ \\t]?[0-9])`,
  "g"
);

function inRanges(cp: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([a, b]) => cp >= a && cp <= b);
}

const isDrop = (cp: number) => inRanges(cp, DROP_RANGES);
const isJamo = (cp: number) => inRanges(cp, JAMO_RANGES);

function decimalValue(cp: number): number | null {
  for (const zero of DIGIT_ZEROS) {
    if (cp >= zero && cp <= zero + 9) {
      return cp - zero;
    }
  }
  return null;
}

/** 한 글자(코드 포인트)를 정리한 글자로 바꾼다. 지우는 문자는 빈 문자열이 된다. */
function replaceOne(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp < 0x80 || (cp >= 0xac00 && cp <= 0xd7a3)) {
    return ch;
  }
  if (isDrop(cp)) {
    return "";
  }
  if (DASH_SET.has(cp)) {
    return "-";
  }
  if (cp >= 0xff01 && cp <= 0xff5e) {
    return String.fromCharCode(cp - 0xfee0);
  }
  const digit = decimalValue(cp);
  if (digit !== null) {
    return String(digit);
  }
  if (SPACE_CHARS.has(cp)) {
    return " ";
  }
  return ch;
}

/** 앞 글자와 한 묶음으로 볼 글자인가(한글 중성·종성 자모, 지우는 문자). */
function continuesCluster(cp: number): boolean {
  return (
    (cp >= 0x1160 && cp <= 0x11ff) ||
    (cp >= 0xd7b0 && cp <= 0xd7ff) ||
    isDrop(cp)
  );
}

/** 초성·중성(·종성) 자모를 음절로 합친다. NFC의 한글 조합 규칙과 같다. */
function composeHangul(s: string): string {
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    const last = out.length ? out[out.length - 1] : -1;
    if (last >= 0x1100 && last <= 0x1112 && cp >= 0x1161 && cp <= 0x1175) {
      out[out.length - 1] =
        0xac00 + ((last - 0x1100) * 21 + (cp - 0x1161)) * 28;
      continue;
    }
    if (
      last >= 0xac00 &&
      last <= 0xd7a3 &&
      (last - 0xac00) % 28 === 0 &&
      cp >= 0x11a8 &&
      cp <= 0x11c2
    ) {
      out[out.length - 1] = last + (cp - 0x11a7);
      continue;
    }
    out.push(cp);
  }
  return String.fromCodePoint(...out);
}

function sameLength(text: string): string {
  let out = "";
  for (const ch of text) {
    out += replaceOne(ch);
  }
  return out;
}

function hyphenateDigitDots(text: string): string | null {
  DIGIT_DOT_RE.lastIndex = 0;
  if (!DIGIT_DOT_RE.test(text)) {
    return null;
  }
  DIGIT_DOT_RE.lastIndex = 0;
  return text.replace(DIGIT_DOT_RE, "-");
}

export interface NormalizedText {
  original: string;
  /** 탐지용 문자열 */
  text: string;
  /** text[i]가 온 원문 구간. 위치가 원문과 같으면 null */
  starts: number[] | null;
  ends: number[] | null;
  lettersChanged: boolean;
  /** 숫자 사이 점 닮은꼴만 하이픈으로 바꾼 글. 바꿀 것이 없으면 null */
  hyphenated: string | null;
}

/** 탐지용 문자열 기준 탐지를 원문 기준으로 되돌린다. */
export function restoreDetection(n: NormalizedText, d: Detection): Detection {
  let start = d.start;
  let end = d.end;
  if (n.starts && n.ends) {
    if (start >= end) {
      const p = start < n.starts.length ? n.starts[start] : n.original.length;
      start = p;
      end = p;
    } else {
      start = n.starts[start];
      end = n.ends[end - 1];
    }
  }
  return { ...d, start, end, text: n.original.slice(start, end) };
}

function needsMap(text: string): boolean {
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isDrop(cp) || isJamo(cp)) {
      return true;
    }
  }
  return false;
}

/** 탐지용으로 정리한 문자열과 원문 위치 대응표를 만든다. */
export function normalize(text: string): NormalizedText {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(text)) {
    return {
      original: text,
      text,
      starts: null,
      ends: null,
      lettersChanged: false,
      hyphenated: null,
    };
  }
  if (!needsMap(text)) {
    // 한 글자를 한 글자로만 바꾸는 경우. 단, 지우지 않는 보조평면 글자는 그대로라 길이가 같다.
    const cleaned = sameLength(text);
    return {
      original: text,
      text: cleaned,
      starts: null,
      ends: null,
      lettersChanged: false,
      hyphenated: hyphenateDigitDots(cleaned),
    };
  }
  return normalizeWithMap(text);
}

function normalizeWithMap(text: string): NormalizedText {
  const pieces: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  const n = text.length;
  const cpAt = (i: number) => text.codePointAt(i)!;
  const width = (i: number) => (cpAt(i) > 0xffff ? 2 : 1);

  const addPlain = (a: number, b: number) => {
    // 이 구간은 지우거나 합칠 글자가 없어 글자 수가 그대로다(UTF-16 단위로도 같다).
    pieces.push(sameLength(text.slice(a, b)));
    for (let i = a; i < b; i++) {
      starts.push(i);
      ends.push(i + 1);
    }
  };

  let done = 0;
  let k = 0;
  while (k < n) {
    const cp = cpAt(k);
    const w = width(k);
    if (!(isDrop(cp) || isJamo(cp))) {
      k += w;
      continue;
    }
    // 앞 글자에 이어지는 문자면 묶음은 앞 글자부터다
    let i = k;
    if (k > done && continuesCluster(cp)) {
      i = k - 1;
      const code = text.charCodeAt(i);
      if (code >= 0xdc00 && code <= 0xdfff && i - 1 >= done) {
        i -= 1; // 앞 글자가 보조평면 글자(서로게이트 쌍)면 쌍째로 묶는다
      }
    }
    addPlain(done, i);
    let j = i + width(i);
    while (j < n && continuesCluster(cpAt(j))) {
      j += width(j);
    }
    let piece = "";
    for (const ch of text.slice(i, j)) {
      piece += replaceOne(ch);
    }
    if (piece.length > 1) {
      piece = composeHangul(piece);
    }
    pieces.push(piece);
    for (let t = 0; t < piece.length; t++) {
      starts.push(i);
      ends.push(j);
    }
    done = j;
    k = j;
  }
  addPlain(done, n);
  const cleaned = pieces.join("");
  let letters = false;
  for (const ch of text) {
    if (inRanges(ch.codePointAt(0)!, LETTER_CHANGE_RANGES)) {
      letters = true;
      break;
    }
  }
  return {
    original: text,
    text: cleaned,
    starts,
    ends,
    lettersChanged: letters,
    hyphenated: hyphenateDigitDots(cleaned),
  };
}
