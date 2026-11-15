import { compareVersions } from './version.util';

describe('compareVersions', () => {
  it('작은 버전은 음수, 같으면 0, 큰 버전은 양수를 돌려준다', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
  });
});
