# 🌙 별일컴퍼니
> **"별이 뜨는 시간에 시작하는 작은 일, 별일 아닌 일부터 특별한 내일까지"**  
> 시차 기반 단계형 일경험 및 사회적 연결 회복 플랫폼

![Status](https://img.shields.io/badge/status-Planning-ffc107.svg)

**[🎯 Target Tech Stack]**
![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-61DAFB?logo=react&logoColor=white)
![NestJS](https://img.shields.io/badge/Backend-NestJS%20%7C%20TypeScript-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)

<br>

## 📖 프로젝트 개요
**별일컴퍼니**는 일반적인 취업 절차나 대면 근무에 바로 참여하기 어려운 고립·은둔 청년들을 위한 **웹 기반 원격 마이크로태스크 플랫폼**입니다. 
청년들의 주야역전 생활 리듬을 강제로 교정하는 대신, 한국의 밤 시간과 해외의 낮 시간이 겹치는 **'시차'**를 경제 활동의 자원으로 활용합니다. 집에서 수행할 수 있는 짧은 실제 업무부터 시작하여 점진적으로 성취 경험과 자기효능감을 쌓고, 궁극적으로 사회 진입의 안전한 징검다리 역할을 수행합니다.

<br>

## ✨ 핵심 기능 (Key Features)

### 1. 🕒 밤 11시, 시차 기반 업무 매칭 스케줄러
- 타임존 연산을 통해 해외 기업의 업무 시간과 청년의 활동 가능 시간을 계산합니다.
- 매일 밤 11시 정각, 백엔드 크론 워커(Cron Worker)를 통해 맞춤형 업무가 무중단으로 자동 오픈됩니다.

### 2. 📈 단계별 난이도 분할 (Level-based Task Routing)
- 진입 장벽을 낮추기 위해 사회성 및 난이도 기준의 **레벨형 퀘스트**를 도입했습니다.
- 혼자 하는 단순 작업(Lv.1)부터 의뢰자와의 소통(Lv.3), 협업(Lv.4)까지 단계적으로 확장됩니다.

### 3. 🤖🤝 AI-Human 하이브리드 코디네이팅 시스템
- **AI 코디네이터 (OpenAI/Gemini API):** 해외 원문 업무 자동 분할, 작업 가이드 생성, 결과물 1차 검수를 수행하여 야간 운영 부담을 최소화합니다.
- **관리자 및 멘토 (Human Care):** 사기/피싱 공고 사전 차단(최종 승인) 및 대인 스트레스 관리, 정서적 힐링 피드백을 제공하여 심리적 안전망을 구축합니다.

<br>

## 📁 산출물 및 관리 문서 (Documentation)
강의 요구사항 및 프로젝트 진행 간 작성된 핵심 문서들은 `Doc` 폴더 내에서 확인할 수 있습니다.

| 문서명 | 링크 | 설명 |
|---|---|---|
| **수행계획서** | [📄 오픈소스프로젝트 수행계획서](./Doc/1_1_OSSProj_02_PING_수행계획서.pdf) | 기획 배경, 전체 아키텍처 및 핵심 개발 목표 명세 |
| **주간 회의록** | [📝 9월 1~4주차 회의록](./Doc/회의록) | 아이디어 도출 및 멘토 피드백 반영 사항 아카이빙 |
| **발표 자료** | [📎 수행계획 발표자료](./Doc/1_2_OSSProj_02_PING_수행계획발표자료.pdf) | 제안발표용 핵심 요약 PT 자료 |
| **질의응답** | `업로드 예정` | 제안발표 이후 Q&A 및 피드백 정리 문서 |

*(※ 소스코드 및 제품 배포 관련 문서는 향후 `Src` 폴더 및 MVP 개발 진행 시 업데이트됩니다.)*

<br>

## 🛠 목표 기술 스택 (Target Tech Stack)
본 프로젝트의 MVP 구현을 위해 검토 및 확정된 도입 예정 기술입니다.

### Frontend
- **Framework:** React
- **Language:** TypeScript
- **UI/UX:** Figma (설계 및 와이어프레임)

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL, TypeORM
- **Auth & Security:** JWT, Passport.js, RBAC(Role-Based Access Control)

### AI & Infra
- **AI Model:** OpenAI API (GPT-5.6 Luna), Gemini API (3.8 Flash)
- **Infrastructure:** AWS (Ubuntu Linux VM, Managed PostgreSQL)
- **Collaboration:** GitHub, Notion

<br>

## 👨‍💻 팀원 소개 (Team PING)

| 이름 | 전공 | 역할 | GitHub |
|:---:|:---|:---|:---|
| **권민재** | 정보통신공학과 | `팀장` `기획` `Backend` | [@mjkwon314](https://github.com/mjkwon314) |
| **어수빈** | 경영정보학과 | `기획` `UI/UX Design` | [@EoSubeen](https://github.com/EoSubeen) |
| **홍선빈** | 정보통신공학과 | `기획` `Frontend` | [@sunbinn](https://github.com/sunbinn) |
| **김연비** | 정치외교학전공 | `기획` `Frontend` | [@KimYeonBee](https://github.com/KimYeonBee) |
