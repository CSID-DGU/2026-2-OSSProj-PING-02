import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

// 이메일로 보낸 6자리 코드. 코드 원문은 저장하지 않고 HMAC 해시만 저장한다.
// 용도(purpose)별로 회원당 하나만 유지하고, 같은 용도의 이전 코드는 다시 발급할 때 지운다.
export type VerificationPurpose = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

@Entity('email_verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 가입 인증(EMAIL_VERIFY)과 비밀번호 재설정(PASSWORD_RESET)의 코드는 서로 바꿔 쓸 수 없다.
  @Column({ type: 'varchar', length: 20, default: 'EMAIL_VERIFY' })
  purpose: VerificationPurpose;

  @Column({ type: 'char', length: 64 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  // 틀린 입력 횟수. 한도를 넘으면 코드를 무효화하고 다시 받게 한다.
  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
