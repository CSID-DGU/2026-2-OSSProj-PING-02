// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape(https://github.com/ChoHyeonChan/maskingtape) packages/core/maskingtape/types.py를 TS로 옮겼다.

/** 개인정보 종류. 라벨은 index.ts의 DEFAULT_LABELS가 정한다. */
export type PiiKind =
  | "rrn"
  | "phone"
  | "email"
  | "name"
  | "address"
  | "card"
  | "account"
  | "biz_reg"
  | "passport"
  | "birth_date"
  | "driver_license";

/**
 * 텍스트에서 찾은 개인정보 한 건.
 * start/end는 원문 기준 UTF-16 위치다(text.slice(start, end) === 탐지된 조각).
 */
export interface Detection {
  kind: PiiKind;
  start: number;
  end: number;
  text: string;
  /** 탐지 확신도 0~1 */
  confidence: number;
  /** 디버깅용 탐지기 이름 */
  detector: string;
}

export interface Detector {
  readonly kind: PiiKind;
  detect(text: string): Detection[];
}
