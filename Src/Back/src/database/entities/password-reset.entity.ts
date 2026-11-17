import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

// 비밀번호 재설정용으로 이메일에 보낸 6자리 코드. 코드 원문은 저장하지 않고 HMAC 해시만 저장한다.
// 회원당 하나만 유지하고, 다시 발급할 때 이전 코드는 지운다.
@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

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
