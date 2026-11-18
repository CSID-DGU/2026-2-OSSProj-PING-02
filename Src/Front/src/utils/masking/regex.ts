// SPDX-License-Identifier: Apache-2.0
/**
 * 파이썬 re의 search(text, pos, endpos)·match·fullmatch·finditer를 JS RegExp로 흉내 내는 도우미.
 *
 * maskingtape는 파이썬 정규식의 pos/endpos 인자를 많이 쓴다. JS에는 endpos가 없어서
 * 문자열을 endpos에서 자른 뒤 lastIndex로 pos부터 찾는다. 파이썬도 endpos 뒤를 없는 것으로
 * 보고, pos 앞 글자는 뒤보기((?<=…))가 그대로 보므로 동작이 같다.
 */

const cache = new Map<string, RegExp>();

function withFlags(re: RegExp, extra: string): RegExp {
  const flags = Array.from(
    new Set((re.flags.replace(/[gy]/g, "") + extra).split(""))
  ).join("");
  const key = `${flags}/${re.source}`;
  let compiled = cache.get(key);
  if (!compiled) {
    compiled = new RegExp(re.source, flags);
    cache.set(key, compiled);
  }
  return compiled;
}

function clip(text: string, endpos?: number): string {
  return endpos === undefined || endpos >= text.length
    ? text
    : text.slice(0, Math.max(0, endpos));
}

/** re.search(text, pos, endpos) */
export function search(
  re: RegExp,
  text: string,
  pos = 0,
  endpos?: number
): RegExpExecArray | null {
  const g = withFlags(re, "g");
  g.lastIndex = Math.max(0, pos);
  return g.exec(clip(text, endpos));
}

/** re.match(text, pos, endpos) — pos 자리에서 바로 시작해야 한다. */
export function matchAt(
  re: RegExp,
  text: string,
  pos = 0,
  endpos?: number
): RegExpExecArray | null {
  const y = withFlags(re, "y");
  y.lastIndex = Math.max(0, pos);
  return y.exec(clip(text, endpos));
}

/** re.fullmatch(text, pos, endpos) */
export function fullMatch(
  re: RegExp,
  text: string,
  pos = 0,
  endpos?: number
): boolean {
  const end =
    endpos === undefined ? text.length : Math.min(endpos, text.length);
  if (pos > end) {
    return false;
  }
  // 파이썬 fullmatch는 끝까지 맞는 해석을 역추적으로 찾는다. 끝 고정을 붙여 같은 효과를 낸다.
  const anchored = withFlags(new RegExp(`(?:${re.source})$`, re.flags), "y");
  anchored.lastIndex = pos;
  return anchored.exec(text.slice(0, end)) !== null;
}

/** re.finditer(text, pos, endpos) — 겹치지 않게 앞에서부터 찾는다. */
export function* findIter(
  re: RegExp,
  text: string,
  pos = 0,
  endpos?: number
): Generator<RegExpExecArray> {
  const g = withFlags(re, "g");
  const target = clip(text, endpos);
  g.lastIndex = Math.max(0, pos);
  let m: RegExpExecArray | null;
  while ((m = g.exec(target)) !== null) {
    yield m;
    if (m[0].length === 0) {
      g.lastIndex += 1;
    }
  }
}

/** 매치마다 한 글자만 넘기고 다시 찾는다 — 겹치는 후보도 모두 본다(maskingtape #465·#510). */
export function* searchEveryStart(
  re: RegExp,
  text: string
): Generator<RegExpExecArray> {
  let pos = 0;
  let m: RegExpExecArray | null;
  while ((m = search(re, text, pos)) !== null) {
    yield m;
    pos = m.index + 1;
  }
}

/** re.escape */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\\-/]/g, "\\$&");
}

/** 실제 존재하는 날짜인가(파이썬 datetime.date 생성 성공 여부와 같다). */
export function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}
