import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Gender } from '../../common/enums';
import { AuthProvider } from './auth-provider.entity';
import { RefreshToken } from './refresh-token.entity';
import { TermsAgreement } from './terms-agreement.entity';

// ERD: users. 탈퇴는 즉시 삭제(명세 4-9)로 가정해 deleted_at 은 두지 않았다.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 로그인용 아이디. 소문자 영문으로 시작하는 4~20자(영문 소문자·숫자·밑줄)
  @Column({ type: 'varchar', length: 20, unique: true })
  username: string;

  // 아이디·비밀번호 찾기에 쓰는 연락 이메일. 가입할 때 인증하지 않으므로 중복을 막지 않는다
  // (남의 이메일을 먼저 적어 그 이메일로 가입하지 못하게 하는 일을 막기 위해). 카카오 가입자가 제공하지 않으면 null
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  // 카카오 전용 계정은 null
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'date' })
  birthdate: string;

  @Column({ type: 'varchar', length: 10 })
  gender: Gender;

  // 비밀번호를 연속으로 틀린 횟수. 로그인에 성공하면 0으로 돌아간다.
  @Column({ type: 'smallint', default: 0 })
  failedLoginCount: number;

  // 이 시각까지 로그인을 막는다. 연속 실패가 한도를 넘으면 정해 둔 시간만큼 잠근다.
  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => AuthProvider, (p) => p.user)
  authProviders: AuthProvider[];

  @OneToMany(() => RefreshToken, (t) => t.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => TermsAgreement, (a) => a.user)
  termsAgreements: TermsAgreement[];
}
