import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TermsType } from '../../common/enums';

@Entity('terms')
@Unique(['type', 'version'])
export class Terms {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: TermsType;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'boolean' })
  required: boolean;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'timestamptz' })
  effectiveAt: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
