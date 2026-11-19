// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape detectors/identity/rrn.py를 TS로 옮겼다.
/**
 * 주민등록번호(외국인등록번호 포함) 탐지기 — 정규식 + 날짜·체크섬 검사.
 *
 * 1. "6자리-7자리" 후보를 찾는다. 8자리 연도 앞자리(19800101-…), 날짜 표기 앞자리
 *    (1980.01.01-…, 1980년 1월 1일-…), 가려 쓴 뒷자리(800101-1******, 800101-1)도 받는다.
 * 2. 앞자리가 실제 날짜인지 검사해 무작위 숫자를 거른다.
 * 3. 체크섬이 맞으면 확신도 1.0, 틀리거나 계산할 수 없으면 0.85(2020-10 이후 발급분은 뒷자리가 난수).
 */
import { isValidDate, matchAt, search, findIter } from "../regex";
import type { Detection, Detector } from "../types";

const MASK_CHAR = "[*Xx●○■#]";
const FRONT_PLAIN = "(?:19|20)?(?<front>\\d{6})";
const FRONT_DATED =
  "(?<front_dated>(?:\\d{4}|\\d{2})" +
  "(?:[./\\-] ?\\d{1,2}[./\\-] ?\\d{1,2}|년\\s?\\d{1,2}월\\s?\\d{1,2}일))";

const DOT_LIKE = "・･•∙⋅․﹒⦁●¸˙";
const BACK_SEP = "[-.\\s–—/_,:·ㆍ‧~|" + DOT_LIKE + "]{0,4}";
const BACK = "(?<back>[1-8]\\d{6})";
const BACK_PARTIAL_SEP = "[ \\t]?[-–—‐－][ \\t]?";
const BACK_PARTIAL_BODY = "[1-8]\\d{0,6}(?:" + MASK_CHAR + "{0,6})?";
const BACK_PARTIAL = "(?<back_partial>" + BACK_PARTIAL_BODY + ")";
const TRAILING_LETTER = "(?:[A-Za-z](?![A-Za-z\\d]|-[A-Za-z\\d]))?";

/** 생년월일 탐지기가 날짜 뒤에 주민번호 뒷자리가 이어지는지 볼 때 쓴다. */
export const RRN_BACK_AHEAD =
  "(?:" +
  BACK_SEP +
  "[1-8]\\d{6}" +
  TRAILING_LETTER +
  "|" +
  BACK_PARTIAL_SEP +
  BACK_PARTIAL_BODY +
  ")(?![\\dA-Za-z])";

const BACK_SPACED =
  "(?<back_spaced>[1-8](?:" +
  Array.from({ length: 6 }, (_, k) => `\\d{${k}} \\d{${6 - k}}`).join("|") +
  "))";
const RRN_FRONT = "(?<!\\d)(?:" + FRONT_PLAIN + "|" + FRONT_DATED + ")";
const RRN_RE = new RegExp(
  RRN_FRONT +
    "(?:" +
    BACK_SEP +
    BACK +
    TRAILING_LETTER +
    "|" +
    BACK_SEP +
    BACK_SPACED +
    "|" +
    BACK_PARTIAL_SEP +
    BACK_PARTIAL +
    ")" +
    "(?![\\dA-Za-z])"
);
const RRN_NO_SPACED_RE = new RegExp(
  RRN_FRONT +
    "(?:" +
    BACK_SEP +
    BACK +
    TRAILING_LETTER +
    "|" +
    BACK_PARTIAL_SEP +
    BACK_PARTIAL +
    ")" +
    "(?![\\dA-Za-z])"
);

const WEIGHTS = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
const RRN_LABEL_RE = /주민|생년월일|출생|생일/;
const RRN_LABEL_WINDOW = 20;

/** 2자리 연도는 1900년대·2000년대 중 하나라도 실제 날짜면 통과(생년월일 탐지기와 같은 기준). */
export function validTwoDigitYearDate(
  yy: number,
  month: number,
  day: number
): boolean {
  return (
    isValidDate(1900 + yy, month, day) || isValidDate(2000 + yy, month, day)
  );
}

function validBirthdate(front: string): boolean {
  return validTwoDigitYearDate(
    +front.slice(0, 2),
    +front.slice(2, 4),
    +front.slice(4, 6)
  );
}

function validDatedFront(frontDated: string): boolean {
  const [y, m, d] = frontDated.match(/\d+/g)!;
  if (y.length === 4) {
    return isValidDate(+y, +m, +d);
  }
  return validTwoDigitYearDate(+y, +m, +d);
}

function hasRrnLabel(text: string, start: number): boolean {
  return (
    search(RRN_LABEL_RE, text, Math.max(0, start - RRN_LABEL_WINDOW), start) !==
    null
  );
}

function partialBackOk(text: string, start: number, back: string): boolean {
  if (new RegExp(MASK_CHAR).test(back) || back.length === 1) {
    return true;
  }
  return hasRrnLabel(text, start);
}

function checksumFront(
  front: string | undefined,
  frontDated: string | undefined
): string {
  if (front !== undefined) {
    return front;
  }
  const [y, m, d] = frontDated!.match(/\d+/g)!;
  return y.slice(-2) + m.padStart(2, "0") + d.padStart(2, "0");
}

function checksumOk(digits: string): boolean {
  let total = 0;
  for (let i = 0; i < 12; i++) {
    total += Number(digits[i]) * WEIGHTS[i];
  }
  return (11 - (total % 11)) % 10 === Number(digits[12]);
}

export class RRNDetector implements Detector {
  readonly kind = "rrn" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    for (let m of findIter(RRN_RE, text)) {
      let viaSpaced = false;
      if (m.groups!.back_spaced !== undefined) {
        if (!hasRrnLabel(text, m.index)) {
          const retry = matchAt(RRN_NO_SPACED_RE, text, m.index);
          if (retry === null) {
            continue;
          }
          m = retry;
        } else {
          viaSpaced = true;
        }
      }
      const g = m.groups!;
      const front = g.front;
      const frontDated = g.front_dated;
      let back = g.back;
      if (viaSpaced) {
        back = g.back_spaced!.replace(/ /g, "");
      } else if (back === undefined) {
        back = g.back_partial!;
        if (!partialBackOk(text, m.index, back)) {
          continue;
        }
      }
      if (front !== undefined) {
        if (!validBirthdate(front)) {
          continue;
        }
      } else if (!validDatedFront(frontDated!)) {
        continue;
      }
      const confidence =
        back.length === 7 && /^\d+$/.test(back)
          ? checksumOk(checksumFront(front, frontDated) + back)
            ? 1.0
            : 0.85
          : 0.85;
      found.push({
        kind: this.kind,
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        confidence,
        detector: "RRNDetector",
      });
    }
    return found;
  }
}
