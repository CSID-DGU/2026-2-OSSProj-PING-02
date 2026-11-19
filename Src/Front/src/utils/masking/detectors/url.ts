// SPDX-License-Identifier: Apache-2.0
/**
 * 링크(URL) 탐지기 — maskingtape에는 없고 말씨앗에서 추가했다.
 *
 * 공유·초대·송금 링크(toss.me/아이디, open.kakao.com/o/…, 사진·문서 공유 주소)에는 사람을 특정하는
 * 아이디·토큰이 들어가는 경우가 많아 주소 전체를 가린다. 링크는 기기에서 원래 값으로 되돌릴 수 있다.
 *
 * - 스킴이 있는 주소: `https://…`, `kakaotalk://…` 같은 앱 링크, `www.…`
 * - 스킴 없이 도메인 + 경로만 쓴 주소: `naver.me/xYz`, `toss.me/minsu`
 *   (경로 없는 `naver.com` 같은 사이트 이름은 개인정보가 아니라서 가리지 않는다)
 * - 한글·공백·괄호·따옴표에서 끊는다. 채팅에서는 링크 바로 뒤에 조사("…/abc에서")나 괄호가 붙기 때문이다.
 * - 끝에 붙은 문장부호(. , ! ? ~ …)는 링크에서 뺀다.
 */
import { findIter } from "../regex";
import type { Detection, Detector } from "../types";

// 링크 안에 올 수 있는 글자: 공백·한글·괄호·따옴표·꺾쇠가 아닌 것
const URL_CHAR = "[^\\s<>\"'`()\\[\\]{}가-힣ㄱ-ㅎㅏ-ㅣ]";
const LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?";

const SCHEME_URL_RE = new RegExp(
  "(?<![A-Za-z0-9])(?:[A-Za-z][A-Za-z0-9+.-]{1,15}://|www\\.)" + URL_CHAR + "+"
);
// 도메인(라벨 1~10개 + 영문 최상위 도메인) 바로 뒤에 경로("/")가 있어야 받는다.
// 앞 글자가 영숫자·@·점이면 이메일이나 더 긴 주소의 일부라서 시작점으로 보지 않는다.
const BARE_URL_RE = new RegExp(
  "(?<![A-Za-z0-9@._%+-])(?:" +
    LABEL +
    "\\.){1,10}[A-Za-z]{2,24}/" +
    URL_CHAR +
    "*"
);
const TRAILING_PUNCT_RE = /[.,!?;:…~]+$/;

export class UrlDetector implements Detector {
  readonly kind = "url" as const;

  detect(text: string): Detection[] {
    const found: Detection[] = [];
    for (const re of [SCHEME_URL_RE, BARE_URL_RE]) {
      for (const m of findIter(re, text)) {
        const value = m[0].replace(TRAILING_PUNCT_RE, "");
        // "https://"만 있고 주소가 없는 경우는 링크가 아니다
        if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\/$|^www\.$/.test(value)) {
          continue;
        }
        found.push({
          kind: this.kind,
          start: m.index,
          end: m.index + value.length,
          text: value,
          confidence: 1.0,
          detector: "UrlDetector",
        });
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }
}
