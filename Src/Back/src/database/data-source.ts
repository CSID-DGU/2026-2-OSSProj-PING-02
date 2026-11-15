import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/**
 * TypeORM CLI(마이그레이션 생성·실행)가 쓰는 설정.
 * 앱 실행 시에는 app.module.ts의 설정을 쓰고, 이 파일은 CLI 전용이다.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'malssiat',
  password: process.env.DB_PASSWORD ?? 'malssiat',
  database: process.env.DB_NAME ?? 'malssiat',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // 스키마 변경은 항상 마이그레이션으로 한다
  namingStrategy: new SnakeNamingStrategy(),
};

export default new DataSource(dataSourceOptions);
