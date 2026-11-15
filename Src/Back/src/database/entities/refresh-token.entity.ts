import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

// 명세 3-1: refreshToken 은 갱신할 때마다 교체(회전)한다.
// replacedBy 가 채워진 토큰이 다시 오면 재사용으로 보고 해당 기기 세션을 모두 폐기한다.
@Entity('refresh_tokens')
@Index(['userId', 'deviceId'])
@Index(['expiresAt'])
@Index(['sessionId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 한 로그인 세션의 식별자. 회전해도 같은 값을 유지하며, accessToken(sid)이 이 값을 가리킨다.
  @Column('uuid')
  sessionId: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 128, unique: true })
  tokenHash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId: string | null;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  replacedBy: string | null;

  @ManyToOne(() => RefreshToken, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replaced_by' })
  replacedByToken?: RefreshToken | null;
}
