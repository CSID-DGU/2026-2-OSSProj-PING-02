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
  // 마스킹된 메시지를 외부 AI 서버(해외)로 보내 요약·답장을 만드는 것에 대한 동의. 문구는 초안(법률 검토 필요)
  AI_TRANSFER = 'AI_TRANSFER',
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
