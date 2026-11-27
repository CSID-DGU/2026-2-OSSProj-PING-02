// AI로 보내기 전에 가릴 이름 목록 (#69). 기기 안에서만 쓰고 서버로 보내지 않음
// - 로그인한 사용자 본인 이름. SessionProvider가 로그인·로그아웃 때 바꿈
// - 친구 이름은 services.friends.getMaskNames, 대화방 이름은 기기 대화 서비스가 더함 (services/index.ts)
// - 보낸 사람 이름은 requestAiReply가 따로 더함

const HANGUL_ONLY = /^[가-힣]+$/;

/**
 * 이름 하나로 가릴 말 목록을 만든다.
 * 한국어 대화에서는 성을 빼고 부르는 일이 많아 성을 뺀 이름도 넣는다 (마스킹 README 예시 ["김민수", "민수"]와 같음)
 * - 세 글자(김민수) → 민수, 네 글자(남궁민수) → 민수
 * - 두 글자 이름은 그대로. 한 글자만 넣으면 엉뚱한 글자까지 가려지고, 마스킹도 한 글자는 받지 않음
 */
export const toMaskNames = (name: string): string[] => {
  const full = name.trim();
  if (!full) return [];
  if (!HANGUL_ONLY.test(full)) return [full];
  if (full.length === 3) return [full, full.slice(1)];
  if (full.length === 4) return [full, full.slice(2)];
  return [full];
};

export interface MaskNameStore {
  /** 로그인한 사용자 이름. 로그아웃이면 null */
  setUserName(name: string | null): void;
  get(): string[];
}

export const createMaskNameStore = (): MaskNameStore => {
  let names: string[] = [];
  return {
    setUserName(name) {
      names = name ? toMaskNames(name) : [];
    },
    get: () => [...names],
  };
};
