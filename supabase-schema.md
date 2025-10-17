# Supabase 테이블 스키마

## 각 팀별 테이블 생성

각 팀(티원, 젠지, 한화)별로 별도의 테이블을 생성합니다.

### 1. 티원 (T1) 테이블

```sql
-- T1 경기 일정 테이블
CREATE TABLE IF NOT EXISTS t1_matches (
  id BIGSERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  match_time TIME,
  match_datetime TIMESTAMPTZ,
  opponent VARCHAR(100) NOT NULL,
  tournament VARCHAR(200) NOT NULL,
  league VARCHAR(100),
  match_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_t1_match_date ON t1_matches(match_date);
CREATE INDEX IF NOT EXISTS idx_t1_match_id ON t1_matches(match_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE t1_matches ENABLE ROW LEVEL SECURITY;

-- 읽기 권한 정책 (anon 키로 읽기 가능)
CREATE POLICY "Allow public read access" ON t1_matches
  FOR SELECT USING (true);

-- 쓰기 권한 정책 (anon 키로 쓰기 가능)
CREATE POLICY "Allow public insert access" ON t1_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON t1_matches
  FOR UPDATE USING (true);
```

### 2. 젠지 (Gen.G) 테이블

```sql
-- Gen.G 경기 일정 테이블
CREATE TABLE IF NOT EXISTS geng_matches (
  id BIGSERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  match_time TIME,
  match_datetime TIMESTAMPTZ,
  opponent VARCHAR(100) NOT NULL,
  tournament VARCHAR(200) NOT NULL,
  league VARCHAR(100),
  match_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_geng_match_date ON geng_matches(match_date);
CREATE INDEX IF NOT EXISTS idx_geng_match_id ON geng_matches(match_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE geng_matches ENABLE ROW LEVEL SECURITY;

-- 읽기 권한 정책
CREATE POLICY "Allow public read access" ON geng_matches
  FOR SELECT USING (true);

-- 쓰기 권한 정책
CREATE POLICY "Allow public insert access" ON geng_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON geng_matches
  FOR UPDATE USING (true);
```

### 3. 한화 (Hanwha Life Esports) 테이블

```sql
-- Hanwha Life Esports 경기 일정 테이블
CREATE TABLE IF NOT EXISTS hle_matches (
  id BIGSERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  match_time TIME,
  match_datetime TIMESTAMPTZ,
  opponent VARCHAR(100) NOT NULL,
  tournament VARCHAR(200) NOT NULL,
  league VARCHAR(100),
  match_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_hle_match_date ON hle_matches(match_date);
CREATE INDEX IF NOT EXISTS idx_hle_match_id ON hle_matches(match_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE hle_matches ENABLE ROW LEVEL SECURITY;

-- 읽기 권한 정책
CREATE POLICY "Allow public read access" ON hle_matches
  FOR SELECT USING (true);

-- 쓰기 권한 정책
CREATE POLICY "Allow public insert access" ON hle_matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON hle_matches
  FOR UPDATE USING (true);
```

## 사용 방법

1. Supabase 대시보드 (https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 "SQL Editor" 선택
4. 위의 SQL 쿼리를 각각 실행

## 테이블 구조 설명

- `id`: 자동 증가 primary key
- `match_date`: 경기 날짜 (DATE)
- `match_time`: 경기 시간 (TIME)
- `match_datetime`: 경기 날짜와 시간 (TIMESTAMPTZ, 타임존 포함)
- `opponent`: 상대팀 이름
- `tournament`: 대회명
- `league`: 리그명 (LCK, MSI, Worlds 등)
- `match_id`: 경기 고유 ID (중복 방지용)
- `created_at`: 레코드 생성 시간
- `updated_at`: 레코드 수정 시간

## 주의사항

- RLS(Row Level Security)가 활성화되어 있어 anon 키로도 읽기/쓰기가 가능합니다
- `match_id`를 UNIQUE로 설정하여 중복 데이터 방지
- 인덱스를 통해 날짜 기반 쿼리 성능 최적화
