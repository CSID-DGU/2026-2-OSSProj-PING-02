import { findUnmaskedKinds } from './unmasked-content.util';

describe('findUnmaskedKinds (마스킹 누락 검사)', () => {
  it.each([
    ['전화번호', '내 번호 010-1234-5678 로 연락해', 'phone'],
    ['붙여 쓴 전화번호', '01012345678로 전화해', 'phone'],
    ['국제 표기 전화번호', '+82 10 1234 5678', 'phone'],
    ['지역번호', '사무실 02-123-4567', 'phone'],
    ['이메일', 'a.b@example.com 으로 보내줘', 'email'],
    ['http 링크', '여기 봐 https://example.com/x', 'url'],
    ['www 링크', 'www.example.com 들어가봐', 'url'],
    ['도메인만', 'naver.com 에서 찾아봐', 'url'],
    ['계좌번호(하이픈)', '국민 123-45-678901 로 보내', 'account'],
    ['계좌번호(연속 숫자)', '3333012345678 카카오뱅크', 'account'],
    ['주민등록번호', '990101-1234567', 'national_id'],
  ])('%s 를 찾는다', (_label, text, kind) => {
    expect(findUnmaskedKinds(text)).toContain(kind);
  });

  it('전화번호는 계좌번호로 한 번 더 잡지 않는다', () => {
    expect(findUnmaskedKinds('내 번호 010-9876-5432')).toEqual(['phone']);
  });

  it('한 문장에 여러 종류가 있으면 모두 알려 준다', () => {
    expect(findUnmaskedKinds('010-1234-5678 이나 a@b.com, 국민 123-45-678901').sort()).toEqual(
      ['account', 'email', 'phone', 'url'].sort(),
    );
  });

  it.each([
    '[친구A] 가 내일 [장소A] 에서 보자고 했어',
    '2026-11-18 에 만나자',
    '오후 3:30 에 보자',
    '3만원만 빌려줄 수 있어?',
    '10000원 보냈어',
    '1층 102호 앞에서 기다릴게',
    '점수 98점 받았어',
  ])('일상 문장은 걸리지 않는다: %s', (text) => {
    expect(findUnmaskedKinds(text)).toEqual([]);
  });
});
