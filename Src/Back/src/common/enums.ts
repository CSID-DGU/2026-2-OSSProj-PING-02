// 명세 출처: ERD 및 데이터베이스 명세서 §6 Enum 정의

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AuthProviderType {
  KAKAO = 'KAKAO',
}

export enum TermsType {
  SERVICE = 'SERVICE',
  PRIVACY = 'PRIVACY',
}

export enum ModelType {
  BASE = 'base',
  ADAPTER = 'adapter',
}

export enum ModelStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}
