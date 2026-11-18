// SPDX-FileCopyrightText: 2026 The maskingtape Authors, 말씨앗 팀
// SPDX-License-Identifier: Apache-2.0
// maskingtape detectors/personal/address.py를 TS로 옮겼다.
/**
 * 주소 탐지기 — 시/도(정식명·축약형)·시/군·구를 앵커로 지번·도로명 주소를 찾는다.
 *
 * 구간을 끝까지 넓히는 게 핵심이다. 시/도만 가리고 "월드컵로237길 49 …"를 남기면 가치가 가장
 * 낮은 부분만 가린 셈이다. 그래서 시/군/구 → 동/읍/면/리·도로명 → 번지 → 건물명·동·층·호 →
 * 참고항목 괄호까지 이어지는 만큼 넓힌다. "서울 사람", "경기 침체"처럼 지역 이름만 쓴 문장은
 * 축약형 뒤에 시/군/구와 동/도로명이 이어질 때만 받아서 거른다.
 * 자세한 근거(이슈 번호 포함)는 원본 address.py의 주석을 참고한다.
 */
import { findIter, search, searchEveryStart } from "../regex";
import type { Detection, Detector } from "../types";

const PROVINCES = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "강원도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
  "제주도",
  "전남광주통합특별시",
];
const PROVINCE_RE = [...PROVINCES]
  .sort((a, b) => b.length - a.length)
  .join("|");

const PROVINCE_ABBR = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];
const GU_CITY_ABBR = [
  "수원",
  "성남",
  "고양",
  "용인",
  "안양",
  "안산",
  "부천",
  "청주",
  "천안",
  "전주",
  "포항",
  "창원",
];
const NO_GU_CITY_ABBR = [
  "남양주",
  "김해",
  "화성",
  "평택",
  "파주",
  "김포",
  "시흥",
  "이천",
];
const ABBR_ANCHORS = [...PROVINCE_ABBR, ...GU_CITY_ABBR].sort(
  (a, b) => b.length - a.length
);
const NO_GU_CITY_ABBR_RE = [...NO_GU_CITY_ABBR]
  .sort((a, b) => b.length - a.length)
  .join("|");

// 시/도명 등에 공백 없이 붙어도 되는 조사·계사. 긴 것부터 둬야 "에서"가 "에"로 잘리지 않는다.
const JOSA =
  "입니다|입니까|예요|였|에서|에게|으로|까지|부터|처럼|보다|조차|마저|밖에|마다|한테|의|에|로|은|는|이|가|을|를|과|와|도|만";

// --- 동/도로명 자리 ---
const BUNJI = "\\d{1,4}(?:-\\d{1,4})?";
const BUNJI_AHEAD = "(?=\\s" + BUNJI + "(?![\\d-]))";
const END = "(?=(?:" + JOSA + ")?(?![가-힣0-9]))";
const ROAD = "[가-힣][가-힣0-9]{0,9}(?<!으)(?:로|길)(?:\\s?\\d{1,4}번?길)?";
const ROAD_END =
  "(?=(?:" +
  JOSA.split("|")
    .filter((j) => j !== "으로")
    .join("|") +
  ")?(?![가-힣0-9]))";
const DONG = "[가-힣]{1,10}(?:\\d{1,2}(?:동|리|가)|동|읍|면|리)";
const TWO_PART =
  "[가-힣]{1,10}(?:읍|면)\\s[가-힣]{1,10}\\d{0,2}리" +
  END +
  "|[가-힣]{1,10}(?:\\d{1,2}(?:동|가)|동|읍|면)\\s" +
  ROAD +
  BUNJI_AHEAD;
const LOCALITY =
  "(?:" +
  TWO_PART +
  ")" +
  "|" +
  ROAD +
  BUNJI_AHEAD +
  "|" +
  DONG +
  END +
  "|" +
  ROAD +
  ROAD_END +
  "|[가-힣]{1,10}(?:동|읍|면|리)|[가-힣]{1,10}(?:로|길)(?:\\s?\\d{1,4}번?길)?";

const NOT_LOCALITY = "(?!" + DONG + END + "|" + ROAD + BUNJI_AHEAD + ")";
const GLUED_GU_WORD = "(?:[중동서남북]구|(?!시군구)[가-힣]{2,10}[시군구])";
const GLUED_GU_AHEAD =
  "(?![가-힣]{0,9}(?:" + PROVINCE_RE + "))(?=" + GLUED_GU_WORD + END + ")";
const GU =
  "(?:(?:\\s|" +
  GLUED_GU_AHEAD +
  ")" +
  NOT_LOCALITY +
  "(?<gu>[가-힣]{1,10}[시군구]))?";
const GU2 =
  "(?:\\s" +
  NOT_LOCALITY +
  "(?!" +
  PROVINCE_RE +
  ")(?<gu2>[가-힣]{1,10}[군구]))?";

// --- 번지 뒤 상세주소(건물명·동·층·호)와 참고항목 ---
const BUILDING_SUFFIX =
  "아파트|빌라|오피스텔|맨션|타워|빌딩|센터|스퀘어|프라자|플라자|타운|파크|캐슬|하이츠|빌리지" +
  "|팰리스|레지던스|상가|연립|주택";
const FLOOR =
  "(?:(?:지하|지상)\\s?\\d{1,2}층|[Bb]\\d{1,2}층?|\\d{1,3}층|\\d{1,2}[Ff])(?![A-Za-z])" +
  END;
const HO = "[A-Za-z]?\\d{1,5}호" + END;
const HYPHEN_UNIT = "\\d{2,4}-\\d{3,5}호?(?![\\d-])" + END;
const UNIT_HO = "(?:" + HO + "|" + HYPHEN_UNIT + ")";
const SEP = "[,\\s]\\s{0,3}";
const BUILDING_DONG =
  "(?:\\d{1,4}동|[A-Za-z]동|[가나다라마바사아자차카타파하]동(?=" +
  SEP +
  "(?:" +
  FLOOR +
  "|" +
  HO +
  ")))";
const UNIT_SEP = "(?:" + SEP + "|(?<=동))";
const GLUED_BUILDING_DONG =
  "(?:동(?=" + SEP + "(?:" + FLOOR + "|" + UNIT_HO + ")|" + UNIT_HO + "))?";
const FLOOR_AFTER_HO = "(?:" + SEP + "(?<floor_after_ho>" + FLOOR + "))?";

const TAIL =
  "(?:\\s(?<dong>" +
  LOCALITY +
  "))?" +
  "(?:\\s(?<bunji>" +
  BUNJI +
  ")(?![\\d-])(?:번지)?(?:\\s?호)?)?" +
  "(?:[,\\s]\\s*(?<building>[0-9A-Za-z가-힣]{1,20}(?:" +
  BUILDING_SUFFIX +
  ")" +
  GLUED_BUILDING_DONG +
  ")" +
  "|" +
  SEP +
  "(?<building_named>[A-Za-z가-힣][0-9A-Za-z가-힣]{1,19})(?<![님씨])" +
  "(?=" +
  SEP +
  "(?:" +
  BUILDING_DONG +
  "|" +
  FLOOR +
  "|" +
  HO +
  ")))?" +
  "(?:[,\\s]\\s*(?<building_dong>" +
  BUILDING_DONG +
  "))?" +
  "(?:" +
  SEP +
  "(?<floor>" +
  FLOOR +
  "))?" +
  "(?:" +
  UNIT_SEP +
  "(?<building_ho>" +
  UNIT_HO +
  ")" +
  FLOOR_AFTER_HO +
  ")?" +
  "(?:\\s{0,3}\\((?<reference>[가-힣]{1,10}\\d{0,2}(?:동|가|리)" +
  "(?:\\s{0,3},\\s{0,3}[가-힣A-Za-z][0-9A-Za-z가-힣]{0,19})?)\\))?";

// 시/도·도로명 없이 건물명과 세대만 쓴 주소 — "한빛아파트 101동 302호로 보내 주세요"
const BUILDING_UNIT_RE = new RegExp(
  "(?<![0-9A-Za-z가-힣])(?<building>[0-9A-Za-z가-힣]{1,20}(?:" +
    BUILDING_SUFFIX +
    ")" +
    GLUED_BUILDING_DONG +
    ")" +
    "(?:" +
    SEP +
    "(?<building_dong>" +
    BUILDING_DONG +
    "))?" +
    "(?:" +
    SEP +
    "(?<floor>" +
    FLOOR +
    "))?" +
    "(?:" +
    UNIT_SEP +
    "(?<building_ho>" +
    UNIT_HO +
    "))" +
    FLOOR_AFTER_HO
);
const BUILDING_UNIT_CONFIDENCE = 0.6;

const ADDR_RE = new RegExp(
  "(?<province>" +
    PROVINCE_RE +
    ")" +
    "(?:" +
    GLUED_GU_AHEAD +
    "|(?!(?!" +
    JOSA +
    ")[가-힣]))" +
    GU +
    GU2 +
    TAIL
);

// --- 시/군 뒤에 바로 오는 도로명 ---
const ROAD3 = "[가-힣][가-힣0-9]{1,9}(?<!으)(?:로|길)(?:\\s?\\d{1,4}번?길)?";
const BUNJI_JOSA =
  "입니다|이에요|예요|에서|에게|으로|까지|부터|처럼|보다|의|에|로|은|는|이|을|를|과|와";
const BUNJI_AHEAD_STRICT =
  "(?=\\s" +
  BUNJI +
  "(?![\\d-])(?:번지|호)?(?:" +
  BUNJI_JOSA +
  ")?(?![가-힣]))";
const SEJONG_AHEAD =
  "(?=\\s(?:[가-힣]{1,10}(?:\\d{1,2}(?:동|리)|동|읍|면|리)" +
  "(?:\\s" +
  ROAD3 +
  "|\\s[가-힣]{1,10}\\d{0,2}리)?" +
  "|" +
  ROAD3 +
  ")" +
  BUNJI_AHEAD_STRICT +
  ")";

const ADDR_NO_PROVINCE_RE = new RegExp(
  "(?<![가-힣])(?<si>[가-힣]{2,9}[시군])" +
    "(?:(?=\\s(?:[가-힣]{1,10}(?:\\d{1,2}(?:동|리)|구|동|읍|면|리)|" +
    ROAD3 +
    BUNJI_AHEAD_STRICT +
    "))" +
    "|(?=(?:[중동서남북]구|[가-힣]{2,10}구)" +
    END +
    "))" +
    GU +
    GU2 +
    TAIL
);

const ADDR_ABBR_RE = new RegExp(
  "(?<![가-힣])(?:(?<abbr>" +
    ABBR_ANCHORS.join("|") +
    ")(?!특별|광역)" +
    "(?:(?=\\s" +
    NOT_LOCALITY +
    "[가-힣]{1,10}[시군구])|" +
    GLUED_GU_AHEAD +
    ")" +
    "|세종" +
    SEJONG_AHEAD +
    ")" +
    GU +
    GU2 +
    TAIL
);

const ADDR_NO_GU_CITY_ABBR_RE = new RegExp(
  "(?<![가-힣])(?<abbr>" +
    NO_GU_CITY_ABBR_RE +
    ")(?=\\s" +
    ROAD3 +
    BUNJI_AHEAD_STRICT +
    ")" +
    GU +
    GU2 +
    TAIL
);

const ADDR_GU_RE = new RegExp(
  "(?<![가-힣])(?<si>[중동서남북]구|[가-힣]{2,9}구)(?=\\s(?:" +
    DONG +
    "|" +
    ROAD3 +
    "))" +
    GU +
    GU2 +
    TAIL
);
const GU_CUE_RE =
  /주소|거주|소재지|배송|수령|도착지|자택|사업장|위치|사는 곳|본적|등록기준지|우편|배달/;
const GU_CUE_WINDOW = 15;
const GU_NON_ADDRESS_WORDS = new Set(["지역구", "선거구", "행정구", "자치구"]);

// 조각 사이 공백이 여러 칸이거나 CRLF·공백 섞인 줄바꿈이면 한 칸으로 줄인 사본에서도 찾는다.
const HSPACE = "[ \\t\\u00a0\\u1680\\u2000-\\u200a\\u202f\\u205f\\u3000]";
const WIDE_SPACE_RE = new RegExp(
  HSPACE +
    "*\\r\\n" +
    HSPACE +
    "*|" +
    HSPACE +
    "+\\n" +
    HSPACE +
    "*|\\n" +
    HSPACE +
    "+|" +
    HSPACE +
    "{2,}"
);
const PARAGRAPH_BREAK_RE = /\r?\n[^\S\r\n]*\r?\n|[\u2028\u2029]/;
const LINE_BREAKS = ["\r", "\n", "\u2028", "\u2029"];

function lineEnd(text: string, index: number, limit = text.length): number {
  let best = text.length;
  for (const sep of LINE_BREAKS) {
    const pos = text.indexOf(sep, index);
    if (pos !== -1 && pos < limit && pos < best) {
      best = pos;
    }
  }
  return best;
}

function paragraphStart(text: string, index: number): number {
  let start = 0;
  for (const m of findIter(PARAGRAPH_BREAK_RE, text, 0, index)) {
    start = m.index + m[0].length;
  }
  return start;
}

function startsLineIgnoringSpace(text: string, start: number): boolean {
  let i = start - 1;
  while (i >= 0 && !LINE_BREAKS.includes(text[i]) && /\s/.test(text[i])) {
    i -= 1;
  }
  return i < 0 || LINE_BREAKS.includes(text[i]);
}

function hasLeadingAddressCue(text: string, start: number): boolean {
  return (
    search(GU_CUE_RE, text, Math.max(0, start - GU_CUE_WINDOW), start) !== null
  );
}

function hasGuCue(text: string, start: number, end: number): boolean {
  if (hasLeadingAddressCue(text, start)) {
    return true;
  }
  const afterLimit = Math.min(text.length, end + GU_CUE_WINDOW);
  if (
    search(
      GU_CUE_RE,
      text,
      end,
      Math.min(lineEnd(text, end, afterLimit), afterLimit)
    )
  ) {
    return true;
  }
  if (startsLineIgnoringSpace(text, start)) {
    return search(GU_CUE_RE, text, paragraphStart(text, start), start) !== null;
  }
  return false;
}

function collapseWideSpaces(text: string): [string, (i: number) => number] {
  const marks = [0];
  const origins = [0];
  for (const m of findIter(WIDE_SPACE_RE, text)) {
    marks.push(
      marks[marks.length - 1] + m.index - origins[origins.length - 1] + 1
    );
    origins.push(m.index + m[0].length);
  }
  const toOriginal = (index: number) => {
    // bisect_right(marks, index) - 1
    let lo = 0;
    let hi = marks.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (marks[mid] <= index) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const k = lo - 1;
    return origins[k] + index - marks[k];
  };
  return [text.replace(new RegExp(WIDE_SPACE_RE.source, "g"), " "), toOriginal];
}

function score(
  g: Record<string, string | undefined>,
  base: number,
  cap: number
): number {
  let c = base;
  if (g.gu) c += 0.15;
  if (g.gu2) c += 0.05;
  if (g.dong) c += 0.15;
  if (g.bunji) c += 0.2;
  if (g.building || g.building_named) c += 0.15;
  return Math.round(Math.min(c, cap) * 100) / 100;
}

type Candidate = [number, number, number];

function candidates(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const m of searchEveryStart(ADDR_RE, text)) {
    out.push([m.index, m.index + m[0].length, score(m.groups!, 0.5, 1.0)]);
  }
  for (const re of [
    ADDR_ABBR_RE,
    ADDR_NO_PROVINCE_RE,
    ADDR_NO_GU_CITY_ABBR_RE,
    ADDR_GU_RE,
  ]) {
    for (const m of searchEveryStart(re, text)) {
      const g = m.groups!;
      if (!g.dong) {
        continue;
      }
      if (
        re === ADDR_NO_GU_CITY_ABBR_RE &&
        !hasLeadingAddressCue(text, m.index)
      ) {
        continue;
      }
      if (re === ADDR_GU_RE) {
        if (
          GU_NON_ADDRESS_WORDS.has(g.si!) ||
          !hasGuCue(text, m.index, m.index + m[0].length)
        ) {
          continue;
        }
      }
      out.push([m.index, m.index + m[0].length, score(g, 0.4, 0.9)]);
    }
  }
  for (const m of findIter(BUILDING_UNIT_RE, text)) {
    out.push([m.index, m.index + m[0].length, BUILDING_UNIT_CONFIDENCE]);
  }
  return out;
}

export class AddressDetector implements Detector {
  readonly kind = "address" as const;

  detect(text: string): Detection[] {
    let cands = candidates(text);
    if (search(WIDE_SPACE_RE, text)) {
      const [collapsed, toOriginal] = collapseWideSpaces(text);
      cands = cands.concat(
        candidates(collapsed).map(
          ([s, e, c]) => [toOriginal(s), toOriginal(e - 1) + 1, c] as Candidate
        )
      );
    }
    cands.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const merged: Candidate[] = [];
    for (const [s, e, c] of cands) {
      const last = merged[merged.length - 1];
      if (last && s < last[1]) {
        last[1] = Math.max(last[1], e);
        last[2] = Math.max(last[2], c);
      } else {
        merged.push([s, e, c]);
      }
    }
    return merged.map(([start, end, confidence]) => ({
      kind: this.kind,
      start,
      end,
      text: text.slice(start, end),
      confidence,
      detector: "AddressDetector",
    }));
  }
}
