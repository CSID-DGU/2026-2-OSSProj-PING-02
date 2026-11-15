import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Terms } from './terms.entity';
import { User } from './user.entity';

@Entity('terms_agreements')
@Unique(['userId', 'termsId'])
export class TermsAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (u) => u.termsAgreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  termsId: string;

  @ManyToOne(() => Terms, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'terms_id' })
  terms: Terms;

  @Column({ type: 'boolean' })
  agreed: boolean;

  @Column({ type: 'timestamptz' })
  agreedAt: Date;
}
