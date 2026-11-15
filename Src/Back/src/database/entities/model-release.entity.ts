import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ModelStatus, ModelType } from '../../common/enums';

// 서버는 모델 "메타"만 보관한다. 실제 파일은 오브젝트 스토리지(storage_key)에 있다.
@Entity('model_releases')
@Index(['status', 'type', 'createdAt'])
export class ModelRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  type: ModelType;

  @Column({ type: 'varchar', length: 30, nullable: true })
  task: string | null;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'varchar', length: 200 })
  filename: string;

  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  sizeBytes: number;

  @Column({ type: 'char', length: 64 })
  sha256: string;

  @Column({ type: 'char', length: 64, nullable: true })
  baseModelSha256: string | null;

  @Column({ type: 'varchar', length: 20 })
  quantization: string;

  @Column({ type: 'varchar', length: 20 })
  minAppVersion: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  storageKey: string;

  @Column({ type: 'smallint', default: 100 })
  rolloutPercent: number;

  @Column({ type: 'varchar', length: 20, default: ModelStatus.DRAFT })
  status: ModelStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
