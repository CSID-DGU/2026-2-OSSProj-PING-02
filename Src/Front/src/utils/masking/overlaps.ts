// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape packages/core/maskingtape/overlaps.py를 TS로 옮겼다.
import type { Detection } from "./types";

/**
 * 겹치는 탐지 구간을 합친다. 어느 쪽도 버리지 않는다.
 *
 * 덜 가리는 것은 유출이고 더 가리는 것은 안전한 실패다. 그래서 겹치면 넓은 쪽(합집합)으로
 * 가리고, 종류(kind)만 확신도가 높은 쪽을 따른다. 예: 주소 탐지가 뒤따르는 주민번호 앞자리를
 * 번지로 삼켜도 주민번호 뒷자리가 남지 않는다.
 */
export function resolveOverlaps(
  detections: Detection[],
  text: string
): Detection[] {
  const ordered = [...detections].sort(
    (a, b) =>
      a.start - b.start ||
      b.end - b.start - (a.end - a.start) ||
      b.confidence - a.confidence
  );
  const result: Detection[] = [];
  for (const d of ordered) {
    const prev = result[result.length - 1];
    if (!prev || d.start >= prev.end) {
      result.push(d);
      continue;
    }
    if (d.end <= prev.end) {
      // 완전 포함 — 넓은 구간을 유지하고 종류는 확신도 높은 쪽을 따른다.
      if (d.confidence > prev.confidence) {
        result[result.length - 1] = {
          ...prev,
          kind: d.kind,
          confidence: d.confidence,
        };
      }
      continue;
    }
    // 부분 겹침 — 범위는 합집합, 종류는 확신도 높은 쪽
    const winner = d.confidence > prev.confidence ? d : prev;
    result[result.length - 1] = {
      ...winner,
      start: prev.start,
      end: d.end,
      text: text.slice(prev.start, d.end),
    };
  }
  return result;
}
