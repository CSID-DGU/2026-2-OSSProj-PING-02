// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
/**
 * 서버(→ LLM)로 보내기 전에 기기에서 개인정보를 가리는 모듈.
 *
 * 탐지 규칙은 maskingtape(https://github.com/ChoHyeonChan/maskingtape, Apache-2.0)의
 * 규칙 탐지기를 TS로 옮겼다. 이름만 우리 서비스의 사용자·친구 이름 사전으로 찾는다.
 *
 *   const masked = maskPii('민수야 내 번호 010-1234-5678', { names: ['김민수', '민수'] });
 *   masked.text    // "[이름1]야 내 번호 [전화번호1]"
 *   masked.mapping // { "[이름1]": "민수", "[전화번호1]": "010-1234-5678" }  ← 기기에만 둔다
 *   unmaskPii(llmReply, masked.mapping) // LLM 답에 남은 자리표시를 원래 값으로 되돌린다
 *
 * mapping은 원문 개인정보 자체이므로 절대 서버로 보내지 않는다.
 */
import { AddressDetector } from "./detectors/address";
import { EmailDetector, PhoneDetector } from "./detectors/contact";
import { AccountDetector, CreditCardDetector } from "./detectors/financial";
import {
  BirthDateDetector,
  BusinessRegistrationDetector,
  DriverLicenseDetector,
  PassportDetector,
} from "./detectors/identity";
import { KnownNameDetector } from "./detectors/name";
import { RRNDetector } from "./detectors/rrn";
import { UrlDetector } from "./detectors/url";
import { normalize, restoreDetection } from "./normalize";
import { resolveOverlaps } from "./overlaps";
import type { Detection, Detector, PiiKind } from "./types";

export type { Detection, Detector, PiiKind } from "./types";
export { KnownNameDetector } from "./detectors/name";

export const DEFAULT_LABELS: Record<PiiKind, string> = {
  rrn: "주민등록번호",
  phone: "전화번호",
  email: "이메일",
  name: "이름",
  address: "주소",
  card: "카드번호",
  account: "계좌번호",
  biz_reg: "사업자등록번호",
  passport: "여권번호",
  birth_date: "생년월일",
  driver_license: "운전면허",
  url: "링크",
};

/**
 * 이름을 뺀 규칙 탐지기 기본 세트. 순서는 maskingtape default_detectors()와 같고,
 * 말씨앗에서 추가한 링크 탐지기를 맨 앞에 둔다(링크 안의 숫자가 전화·계좌로 따로 잡혀도 링크 하나로 합쳐짐).
 */
export function defaultDetectors(): Detector[] {
  return [
    new UrlDetector(),
    new RRNDetector(),
    new PassportDetector(),
    new DriverLicenseDetector(),
    new PhoneDetector(),
    new EmailDetector(),
    new AddressDetector(),
    new CreditCardDetector(),
    new AccountDetector(),
    new BusinessRegistrationDetector(),
    new BirthDateDetector(),
  ];
}

export interface MaskOptions {
  /** 가릴 이름 목록(사용자 본인, 친구, 대화 상대의 이름·별명·아이디) */
  names?: Iterable<string>;
  /** 탐지기를 직접 고를 때. 넘기면 names와 기본 세트 대신 이것만 쓴다. */
  detectors?: Detector[];
}

function buildDetectors(options: MaskOptions): Detector[] {
  if (options.detectors) {
    return options.detectors;
  }
  const detectors = defaultDetectors();
  if (options.names) {
    detectors.push(new KnownNameDetector(options.names));
  }
  return detectors;
}

/**
 * 가리지 않고 탐지 결과만 돌려준다. 겹치는 구간은 합친다(더 가리는 쪽).
 *
 * 전각 숫자·폭 없는 공백·대시 변형·분해된 자모처럼 표기를 정리하면 달라지는 입력은 원문과
 * 정리본 둘 다에서 찾아 합친다. 숫자 사이 가운뎃점(010·1234·5678)은 하이픈으로 읽은 글에서도 찾는다.
 */
export function scanPii(text: string, options: MaskOptions = {}): Detection[] {
  const detectors = buildDetectors(options);
  const prepared = normalize(text);
  const found: Detection[] = [];
  for (const detector of detectors) {
    found.push(...detector.detect(text));
    if (prepared.text !== text) {
      found.push(
        ...detector
          .detect(prepared.text)
          .map((d) => restoreDetection(prepared, d))
      );
    }
    if (prepared.hyphenated !== null) {
      found.push(
        ...detector
          .detect(prepared.hyphenated)
          .map((d) => restoreDetection(prepared, d))
      );
    }
  }
  return resolveOverlaps(found, text);
}

export interface MaskResult {
  /** 개인정보를 [종류N] 자리표시로 바꾼 글. 서버로는 이것만 보낸다. */
  text: string;
  detections: Detection[];
  /** 자리표시 → 원래 값. 기기 밖으로 내보내지 않는다. */
  mapping: Record<string, string>;
}

/**
 * 개인정보를 종류별 번호 붙은 자리표시로 바꾼다. 같은 값은 같은 번호를 받아
 * "같은 사람/같은 번호"라는 문맥이 LLM에 남는다.
 */
export function maskPii(text: string, options: MaskOptions = {}): MaskResult {
  const detections = scanPii(text, options);
  const numbers = new Map<string, number>();
  const counts = new Map<PiiKind, number>();
  const placeholders: string[] = [];
  const mapping: Record<string, string> = {};
  for (const d of detections) {
    // 이름은 대소문자만 다른 아이디를 같은 사람으로 본다.
    const value = d.kind === "name" ? d.text.toLowerCase() : d.text;
    const key = `${d.kind}\u0000${value}`;
    let n = numbers.get(key);
    if (n === undefined) {
      n = (counts.get(d.kind) ?? 0) + 1;
      counts.set(d.kind, n);
      numbers.set(key, n);
    }
    const placeholder = `[${DEFAULT_LABELS[d.kind] ?? d.kind}${n}]`;
    placeholders.push(placeholder);
    mapping[placeholder] ??= d.text;
  }
  let out = text;
  for (let i = detections.length - 1; i >= 0; i--) {
    const d = detections[i];
    out = out.slice(0, d.start) + placeholders[i] + out.slice(d.end);
  }
  return { text: out, detections, mapping };
}

// 받침에 따라 모양이 바뀌는 조사: [받침 있을 때, 받침 없을 때]
const JOSA_PAIRS: Array<[string, string]> = [
  ["이랑", "랑"],
  ["으로", "로"],
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
  ["아", "야"],
];
const JOSA_FORMS = new Map<string, [string, string]>(
  JOSA_PAIRS.flatMap((pair) => [
    [pair[0], pair],
    [pair[1], pair],
  ])
);
// 조사 뒤에 한글이 더 이어지면("[이름1]이는") 다른 말일 수 있어 건드리지 않는다.
const JOSA_AFTER = new RegExp(
  "^(" +
    [...JOSA_FORMS.keys()].sort((a, b) => b.length - a.length).join("|") +
    ")(?![가-힣])"
);

/** 마지막 글자의 받침. 한글 음절이 아니면 null, 받침이 없으면 0, ㄹ 받침이면 8. */
function finalConsonant(word: string): number | null {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) {
    return null;
  }
  return (code - 0xac00) % 28;
}

/** 원래 값의 받침에 맞게 조사를 고른다("민수" + 아 → 야, "지은" + 야 → 아). */
function fitJosa(original: string, josa: string): string {
  const pair = JOSA_FORMS.get(josa);
  const jong = finalConsonant(original);
  if (!pair || jong === null) {
    return josa;
  }
  if (pair[0] === "으로") {
    return jong === 0 || jong === 8 ? "로" : "으로";
  }
  return jong === 0 ? pair[1] : pair[0];
}

/**
 * LLM 응답 등에 남은 자리표시를 원래 값으로 되돌린다. 기기 안에서만 부른다.
 * 자리표시 바로 뒤의 조사는 원래 값의 받침에 맞게 고친다("[이름1]아" → "민수야").
 */
export function unmaskPii(
  text: string,
  mapping: Record<string, string>
): string {
  let out = text;
  for (const [placeholder, original] of Object.entries(mapping)) {
    const pieces = out.split(placeholder);
    out = pieces[0];
    for (let i = 1; i < pieces.length; i++) {
      const josa = JOSA_AFTER.exec(pieces[i]);
      out += josa
        ? original +
          fitJosa(original, josa[1]) +
          pieces[i].slice(josa[1].length)
        : original + pieces[i];
    }
  }
  return out;
}
