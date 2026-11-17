import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

// 계정으로 나간 메일의 기록. 메일 종류별 재발송 간격과 하루 총량을 계정 기준으로 제한하는 데만 쓴다.
// 주소·코드·내용은 저장하지 않는다. 가입한 계정에만 쌓이므로 없는 이메일로는 아무것도 남지 않는다.
export type MailKind = 'EMAIL_VERIFY' | 'USERNAME_FIND' | 'PASSWORD_RESET';

@Entity('mail_sends')
@Index(['userId', 'createdAt'])
export class MailSend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  kind: MailKind;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
