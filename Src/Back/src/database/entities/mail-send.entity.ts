import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// 이메일 주소로 나간 메일의 기록. 같은 주소로 메일을 쏟아붓는 것을 막으려고 종류별 재발송 간격과 하루 총량을 센다.
// 주소 원문은 저장하지 않고 SHA-256 해시(key)만 둔다. 가입한 계정의 이메일로 나갈 때만 쌓이므로,
// 없는 이메일로는 아무것도 남지 않는다. 24시간이 지난 기록은 지운다.
export type MailKind = 'USERNAME_FIND' | 'PASSWORD_RESET';

@Entity('mail_sends')
@Index(['key', 'createdAt'])
@Index(['createdAt'])
export class MailSend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 20 })
  kind: MailKind;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
