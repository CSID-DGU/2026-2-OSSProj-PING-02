/**
 * "1.2.3" 형식 버전 비교. a < b 이면 음수, 같으면 0, a > b 이면 양수.
 * 명세 4-11 의 minAppVersion, 4-12 의 minSupportedVersion 비교에 쓴다.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
