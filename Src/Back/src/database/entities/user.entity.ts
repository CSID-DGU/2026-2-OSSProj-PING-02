import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Gender } from '../../common/enums';
import { AuthProvider } from './auth-provider.entity';
import { RefreshToken } from './refresh-token.entity';
import { TermsAgreement } from './terms-agreement.entity';

// ERD: users. 탈퇴는 즉시 삭제(명세 4-9)로 가정해 deleted_at 은 두지 않았다.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 카카오 가입자가 이메일 제공에 동의하지 않으면 null
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
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

  // 이메일 가입자는 인증 코드를 맞히기 전까지 로그인할 수 없다. 카카오 계정은 항상 인증된 것으로 본다.
  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

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
