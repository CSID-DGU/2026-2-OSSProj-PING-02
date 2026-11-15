import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuthProviderType } from '../../common/enums';
import { User } from './user.entity';

@Entity('auth_providers')
@Unique(['provider', 'providerUserId'])
export class AuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.authProviders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  provider: AuthProviderType;

  @Column({ type: 'varchar', length: 100 })
  providerUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
