// SPDX-License-Identifier: Apache-2.0
/**
 * 이름 탐지기 — 우리 서비스가 이미 아는 이름(사용자 본인, 친구, 대화방 상대)만 찾는다.
 *
 * maskingtape의 규칙 이름 탐지기(name.py)는 옮기지 않았다. 일반 문장에서 처음 보는 이름을
 * 찾는 일은 규칙으로 잘 안 되고(대화체 재현율 약 30%), 우리 앱은 가려야 할 이름 목록을 이미
 * 갖고 있기 때문이다.
 *
 * - 한글 이름은 앞뒤 글자를 따지지 않고 찾는다. 조사("민수야", "민수가")가 붙어도 잡히고,
 *   "이민수" 안의 "민수"처럼 더 가리는 쪽으로 틀린다.
 * - 영문·숫자가 섞인 이름(인스타그램 아이디 등)은 대소문자를 무시하고, 앞뒤가 영숫자로
 *   이어지면 다른 낱말의 일부로 보고 받지 않는다.
 * - 한 글자 이름은 오탐이 너무 많아 받지 않는다.
 */
import { escapeRegex, findIter } from "../regex";
import type { Detection, Detector } from "../types";

const HANGUL_ONLY = /^[가-힣]+$/;
const MIN_NAME_LENGTH = 2;

export class KnownNameDetector implements Detector {
  readonly kind = "name" as const;
  private readonly pattern: RegExp | null;

  constructor(names: Iterable<string>) {
    const unique = new Set<string>();
    for (const raw of names) {
      const name = raw.trim();
      if (name.length >= MIN_NAME_LENGTH) {
        unique.add(name);
      }
    }
    // 긴 이름부터 둬야 "김민수"가 "민수"보다 먼저 맞는다.
    const parts = [...unique]
      .sort((a, b) => b.length - a.length)
      .map((name) =>
        HANGUL_ONLY.test(name)
          ? escapeRegex(name)
          : `(?<![A-Za-z0-9_])${escapeRegex(name)}(?![A-Za-z0-9_])`
      );
    this.pattern = parts.length ? new RegExp(parts.join("|"), "i") : null;
  }

  detect(text: string): Detection[] {
    if (!this.pattern) {
      return [];
    }
    return Array.from(findIter(this.pattern, text), (m) => ({
      kind: this.kind,
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
      confidence: 0.95,
      detector: "KnownNameDetector",
    }));
  }
}
