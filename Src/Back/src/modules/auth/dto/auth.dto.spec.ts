import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignupDto } from './auth.dto';

const base = {
  name: '홍길동',
  birthdate: '1999-01-01',
  gender: 'MALE',
  termsAgreements: [],
};

async function passwordErrors(password: string): Promise<string[]> {
  const dto = plainToInstance(SignupDto, { ...base, password });
  const errors = await validate(dto);
  const pw = errors.find((e) => e.property === 'password');
  return pw ? Object.keys(pw.constraints ?? {}) : [];
}

describe('SignupDto 비밀번호 규칙 (8자 이상, 영문+숫자)', () => {
  it('8자 미만이면 거부한다', async () => {
    expect(await passwordErrors('abc1234')).toContain('minLength');
  });

  it('숫자가 없으면 거부한다', async () => {
    expect(await passwordErrors('abcdefgh')).toContain('matches');
  });

  it('영문이 없으면 거부한다', async () => {
    expect(await passwordErrors('12345678')).toContain('matches');
  });

  it('72자를 넘으면 거부한다 (bcrypt 입력 한계)', async () => {
    expect(await passwordErrors(`a1${'x'.repeat(71)}`)).toContain('maxLength');
  });

  it('영문과 숫자를 포함한 8자 이상은 통과한다', async () => {
    expect(await passwordErrors('abcd1234')).toEqual([]);
  });
});
