# 🌱 말씨앗
> **"다시 말을 건넬 힘이 생길 때까지"**  
> 고립·은둔 청년의 연락 부담을 덜어 주는 온디바이스 AI 소통 지원 안드로이드 앱

![Status](https://img.shields.io/badge/status-In%20Development-8BC34A.svg)

**[🎯 Tech Stack]**
![React Native](https://img.shields.io/badge/App-React%20Native%20%7C%20TypeScript-61DAFB?logo=react&logoColor=white)
![Kotlin](https://img.shields.io/badge/Native-Kotlin-7F52FF?logo=kotlin&logoColor=white)
![llama.cpp](https://img.shields.io/badge/On--Device%20AI-llama.cpp%20%7C%20Kanana--2%201.3B-FFB000)
![NestJS](https://img.shields.io/badge/Backend-NestJS%20%7C%20TypeScript-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)

<br>

## 📖 프로젝트 개요
**말씨앗**은 자신의 상황을 설명하거나 상대의 반응을 마주하는 부담 때문에 연락을 미루다 관계가 끊어지기 쉬운 고립·은둔 청년을 위한 **안드로이드 기반 AI 소통 지원 서비스**입니다.

카카오톡, 인스타그램 DM, 문자 알림으로 쌓인 메시지를 요약하고, 상대와의 관계와 대화 상황에 맞는 **답장 후보 2~3개**를 제안합니다. 적극적인 대인관계를 요구하기보다 일상적인 소통의 부담을 낮춰, 사용자가 자신의 속도에 맞춰 기존 관계를 이어갈 수 있도록 돕습니다.

개인적인 대화를 다루기 때문에 메시지 원문과 분석 결과는 **기기 안의 소형 AI 모델로만 처리·저장**하고, 서버는 회원 인증과 AI 모델 배포만 담당합니다.

<br>

## ✨ 핵심 기능 (Key Features)

### 1. 💬 메시지 요약 및 답장 제안
- 알림으로 받은 메시지를 대화방 단위로 묶어 요약합니다. 1:1과 단톡을 구분하고, 단톡에서는 내 이름 언급과 나에게 온 질문을 강조합니다.
- **짧게 / 다정하게 / 공손하게** 세 가지 말투의 답장 후보를 제안하고, 사용자는 고르거나 고친 뒤 복사해서 메신저에서 직접 보냅니다.
- 알림에서 잘린 긴 메시지는 붙여넣기나 공유하기로 받아 바로 요약합니다.

### 2. 📌 꼭 챙길 연락 관리
- 경조사, 오래 답하지 못한 중요한 연락, 마감이 임박한 기관 연락을 **최대 3개까지만** 골라 보여줍니다.
- 경조사와 기관 연락에서 일시·장소·마감·준비물을 뽑아 캘린더에 등록합니다.
- 당장 답하기 어려운 연락은 **나중에 답하기**로 미뤄 두고 원하는 때에 다시 확인합니다.

### 3. 🌱 관계 재연결 도우미
- 오랫동안 연락하지 못한 친구에게 보낼 **부담 적은 첫 마디**를 제안합니다.
- 앱별 계정을 같은 사람으로 합쳐 친구 단위로 관리합니다.

### 4. 🔒 기기 안에서 끝나는 AI 처리
- 한국어 특화 경량 모델(Kanana-2 1.3B)을 llama.cpp로 기기에서 직접 실행합니다.
- 대화 원문과 분석 결과는 SQLCipher로 암호화된 로컬 DB에만 저장되며, 서버로 전송되지 않습니다.
- 스팸·경조사 키워드·@언급·날짜 표현은 룰 필터가 먼저 거르고, 문맥 판단이 필요한 부분만 LLM이 처리합니다.
- AI는 후보만 제안하고 **전송 여부와 시점은 사용자가 결정**합니다. 자동 전송은 없습니다.

<br>

## 📁 레포 구조

```
2026-2-OSSProj-PING-02/
├── Doc/            # 수행계획서, 발표자료, 회의록
├── UI/             # 디자인 시스템 문서와 앱 에셋 (캐릭터, 일러스트, 아이콘)
├── Src/
│   └── Front/      # 안드로이드 앱 (React Native + Kotlin)
└── CONTRIBUTING.md # 이슈·브랜치·커밋·PR 규칙
```

| 폴더 | 설명 | 안내 문서 |
|---|---|---|
| `Src/Front` | 안드로이드 앱 프론트엔드 | [Src/Front/README.md](./Src/Front/README.md) |
| `UI` | Figma 기준 디자인 토큰과 확정 에셋 | [UI/README.md](./UI/README.md) |

*(※ 백엔드는 `Src/` 아래에 별도 폴더로 추가될 예정입니다.)*

<br>

## 📄 산출물 및 관리 문서 (Documentation)
강의 요구사항 및 프로젝트 진행 간 작성된 핵심 문서들은 `Doc` 폴더 내에서 확인할 수 있습니다.

| 문서명 | 링크 | 설명 |
|---|---|---|
| **수행계획서** | [📄 오픈소스프로젝트 수행계획서](./Doc/1_1_OSSProj_02_PING_수행계획서.pdf) | 기획 배경, 전체 아키텍처 및 핵심 개발 목표 명세 |
| **중간보고서** | `업로드 예정` | 중간 개발 현황과 설계·구현 진행 내용 정리 |
| **주간 회의록** | [📝 9월 1~4주차 회의록](./Doc/회의록)<br>[📝 9월 5주차~11월 1주차 회의록](./Doc/회의록/2_3_OSSProj_02_PING_회의록.pdf) | 아이디어 도출, 주간 진행 상황 및 피드백 반영 사항 아카이빙 |
| **발표 자료** | [📎 수행계획 발표자료](./Doc/1_2_OSSProj_02_PING_수행계획발표자료.pdf)<br>[📎 중간발표 발표자료](<./Doc/2_2_OSSProj_02_PING_ 중간발표자료.pdf>) | 제안발표 및 중간발표용 핵심 요약 PT 자료 |
| **질의응답** | `업로드 예정` | 제안발표 이후 Q&A 및 피드백 정리 문서 |
| **디자인** | [🎨 Figma – OSSP-PING](https://www.figma.com/design/MGVPVLr17JxvhsA6TDXf2N/OSSP-PING) | 화면 시안과 디자인 시스템 원본 |

<br>

## 🛠 기술 스택 (Tech Stack)

### App (Android)
- **UI:** React Native, TypeScript, styled-components, React Navigation
- **Native Module:** Kotlin (NotificationListenerService, WorkManager, 공유 인텐트)
- **Local DB:** SQLite + SQLCipher (암호화 키는 Android Keystore에 보관)
- **On-Device AI:** llama.cpp (JNI), Kakao Kanana-2 1.3B (4bit 양자화, GGUF)

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL
- **역할:** 회원 인증, 약관 동의 내역, AI 모델 버전·배포 정보 관리

### Infra & Collaboration
- **Infrastructure:** AWS EC2 또는 Azure (Ubuntu 22.04 LTS), Docker Compose
- **Collaboration:** GitHub, Notion, Figma, Postman

<br>

## 👨‍💻 팀원 소개 (Team PING)

| 이름 | 전공 | 역할 | GitHub |
|:---:|:---|:---|:---|
| **권민재** | 정보통신공학과 | `팀장` `기획` `Backend` | [@mjkwon314](https://github.com/mjkwon314) |
| **어수빈** | 경영정보학과 | `기획` `UI/UX Design` | [@EoSubeen](https://github.com/EoSubeen) |
| **홍선빈** | 정보통신공학과 | `기획` `Frontend` | [@sunbinn](https://github.com/sunbinn) |
| **김연비** | 정치외교학전공 | `기획` `Frontend` | [@KimYeonBee](https://github.com/KimYeonBee) |
