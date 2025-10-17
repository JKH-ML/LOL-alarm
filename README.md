# LOL 경기 알림 시스템

League of Legends 한국 팀(티원, 젠지, 한화) 경기 일정을 자동으로 스크래핑하고 Discord로 알림을 보내는 시스템입니다.

## 기능

- 🕷️ **자동 스크래핑**: lolesports.com에서 경기 일정 수집 (4시간마다)
- 💾 **데이터 저장**: Supabase에 팀별 경기 정보 저장
- 📢 **Discord 알림**: 매일 오전 9시 경기 알림 자동 전송
- ⏰ **GitHub Actions**: 완전 자동화된 스케줄링

## 지원 팀

- 🏆 **티원 (T1)**
- 🏆 **젠지 (Gen.G)**
- 🏆 **한화 (Hanwha Life Esports)**

## 설정 방법

### 1. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `supabase-schema.md` 파일의 SQL 쿼리 실행
3. Project Settings에서 API URL과 anon key 복사

### 2. GitHub Repository Secrets 설정

Repository Settings > Secrets and variables > Actions에서 다음 secrets 추가:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
LOLESPORTS_URL=https://lolesports.com/ko-KR/leagues/first_stand,lck,msi,worlds
T1_WEBHOOK_URL=https://discord.com/api/webhooks/...
GENG_WEBHOOK_URL=https://discord.com/api/webhooks/...
HLE_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. GitHub Actions 활성화

- Repository의 Actions 탭에서 워크플로우 활성화
- "Scrape LOL Esports Schedule" 워크플로우를 수동으로 실행하여 테스트

## 워크플로우

### 📅 스크래핑 스케줄 (scrape.yml)

오전 8시부터 4시간마다 실행:
- 오전 8시
- 오후 12시
- 오후 4시
- 오후 8시
- 자정
- 오전 4시

### 📢 알림 스케줄 (notify.yml)

매일 오전 9시 실행

## 프로젝트 구조

```
lol-alram/
├── .github/
│   └── workflows/
│       ├── scrape.yml      # 스크래핑 워크플로우
│       └── notify.yml      # 알림 워크플로우
├── src/
│   ├── scraper.js          # 스크래핑 스크립트
│   └── notifier.js         # Discord 알림 스크립트
├── package.json
├── supabase-schema.md      # DB 스키마 SQL
└── README.md
```

## 로컬 테스트

### 환경 설정

```bash
cp .env.example .env
# .env 파일 편집하여 실제 값 입력
```

### 의존성 설치

```bash
npm install
npx playwright install chromium
```

### 스크래핑 테스트

```bash
npm run scrape
```

### 알림 테스트

```bash
npm run notify
```

## Discord 메시지 형식

```
오늘 오후 5시 티원 VS 젠지 LCK Spring 경기가 있습니다.
```

## 주의사항

- Public repository이므로 민감한 정보(API 키, 웹훅 URL)는 반드시 GitHub Secrets로 관리
- Supabase 무료 플랜 사용 시 용량 제한 확인
- Discord 웹훅 rate limit 고려 (현재 1초 간격으로 전송)

## 기술 스택

- **Runtime**: Node.js 20
- **Scraping**: Playwright
- **Database**: Supabase (PostgreSQL)
- **Automation**: GitHub Actions
- **Notification**: Discord Webhooks

## 라이선스

ISC
