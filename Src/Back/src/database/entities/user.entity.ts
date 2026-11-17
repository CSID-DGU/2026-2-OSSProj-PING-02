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

  // 로그인용 아이디. 소문자 영문으로 시작하는 4~20자(영문 소문자·숫자·밑줄)
  @Column({ type: 'varchar', length: 20, unique: true })
  username: string;

  // 카카오 전용 계정은 null
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'date' })
  birthdate: string;

  @Column({ type: 'varchar', length: 10 })
  gender: Gender;

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
