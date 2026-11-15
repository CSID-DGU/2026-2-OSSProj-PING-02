import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('app_versions')
export class AppVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  platform: string;

  @Column({ type: 'varchar', length: 20 })
  latestVersion: string;

  @Column({ type: 'varchar', length: 20 })
  minSupportedVersion: string;

  @Column({ type: 'varchar', length: 500 })
  storeUrl: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
