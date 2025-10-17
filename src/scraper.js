import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 한국 팀 목록과 테이블 매핑
const KOREAN_TEAMS = {
  'T1': { name: '티원', table: 't1_matches' },
  'Gen.G': { name: '젠지', table: 'geng_matches' },
  'GenG': { name: '젠지', table: 'geng_matches' },
  'Hanwha Life Esports': { name: '한화', table: 'hle_matches' },
  'HLE': { name: '한화', table: 'hle_matches' }
};

async function scrapeSchedule() {
  console.log('Starting LOL esports schedule scraper...');
  console.log('Supabase URL:', process.env.SUPABASE_URL);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul'
    });

    const page = await context.newPage();

    // API 응답 캡처
    const apiResponses = [];

    page.on('response', async (response) => {
      const url = response.url();

      // lolesports API 호출 감지
      if (url.includes('api.lolesports.com') || url.includes('esports-api')) {
        console.log('API detected:', url);

        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            apiResponses.push({ url, data });
          }
        } catch (e) {
          console.log('Could not parse response:', e.message);
        }
      }
    });

    const LOLESPORTS_URL = process.env.LOLESPORTS_URL || 'https://lolesports.com/ko-KR/leagues/first_stand,lck,msi,worlds';

    console.log('Navigating to:', LOLESPORTS_URL);
    await page.goto(LOLESPORTS_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // 페이지 로딩 대기
    await page.waitForTimeout(10000);

    console.log(`Captured ${apiResponses.length} API responses`);

    // API 응답 저장 (디버깅용)
    if (apiResponses.length > 0) {
      try {
        writeFileSync('api-responses.json', JSON.stringify(apiResponses, null, 2));
        console.log('Saved API responses to api-responses.json');
      } catch (e) {
        console.log('Could not save API responses:', e.message);
      }
    }

    // 모든 API URL 출력
    console.log('\nAll captured API URLs:');
    apiResponses.forEach((resp, idx) => {
      console.log(`${idx + 1}. ${resp.url}`);
    });

    // 경기 데이터 파싱
    const matches = parseMatches(apiResponses);
    console.log(`\nParsed ${matches.length} matches`);

    if (matches.length > 0) {
      console.log('\nMatches found:');
      matches.forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.teamKo} vs ${m.opponent} - ${m.tournament} (${m.matchDate})`);
      });
    }

    // Supabase에 저장
    const savedCount = await saveToSupabase(matches);
    console.log(`\nSaved ${savedCount} matches to Supabase`);

    return {
      success: true,
      matchesFound: matches.length,
      matchesSaved: savedCount,
      matches: matches
    };

  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

function parseMatches(apiResponses) {
  const matches = [];

  console.log('\n=== Parsing API Responses ===');

  for (let i = 0; i < apiResponses.length; i++) {
    const response = apiResponses[i];
    try {
      console.log(`\nProcessing response ${i + 1}/${apiResponses.length}`);
      console.log(`URL: ${response.url}`);

      // API 응답 구조 분석
      const { data } = response;

      // 데이터 구조 출력
      if (data.data) {
        console.log('Response structure:', Object.keys(data.data));
      }

      // 다양한 API 구조 처리
      if (data.data && data.data.schedule) {
        // schedule API
        const events = data.data.schedule.events || [];
        console.log(`Found ${events.length} events in schedule`);

        for (const event of events) {
          const extractedMatches = extractMatchFromEvent(event);
          matches.push(...extractedMatches);
        }
      } else if (data.data && Array.isArray(data.data.events)) {
        // events API
        console.log(`Found ${data.data.events.length} events`);

        for (const event of data.data.events) {
          const extractedMatches = extractMatchFromEvent(event);
          matches.push(...extractedMatches);
        }
      } else {
        console.log('No events found in this response');
        // 구조 확인을 위해 키 출력
        console.log('Available keys:', data.data ? Object.keys(data.data) : 'No data.data');
      }
    } catch (e) {
      console.error('Error parsing API response:', e.message);
      console.error('Stack:', e.stack);
    }
  }

  console.log(`\nTotal matches extracted: ${matches.length}`);
  return matches;
}

function extractMatchFromEvent(event) {
  const matches = [];

  try {
    // 경기 정보 추출
    const match = event.match || event;
    const teams = match.teams || [];

    // 한국 팀이 포함된 경기만 처리
    for (const team of teams) {
      const teamName = team.name || team.code;

      if (KOREAN_TEAMS[teamName]) {
        // 상대팀 찾기
        const opponent = teams.find(t => t.name !== teamName);

        if (opponent) {
          matches.push({
            team: teamName,
            teamKo: KOREAN_TEAMS[teamName].name,
            table: KOREAN_TEAMS[teamName].table,
            opponent: opponent.name || opponent.code,
            tournament: event.league?.name || event.tournament?.name || 'Unknown',
            league: event.league?.slug || '',
            matchDate: event.startTime || event.date,
            matchId: event.id || `${teamName}-${event.startTime}`
          });
        }
      }
    }
  } catch (e) {
    console.error('Error extracting match:', e.message);
  }

  return matches;
}

async function saveToSupabase(matches) {
  let savedCount = 0;

  console.log('\n=== Saving to Supabase ===');

  if (matches.length === 0) {
    console.log('No matches to save');
    return 0;
  }

  for (const match of matches) {
    try {
      const matchDate = new Date(match.matchDate);

      // 날짜 유효성 확인
      if (isNaN(matchDate.getTime())) {
        console.log(`Invalid date for match: ${match.matchId}`);
        continue;
      }

      // 오늘부터 1주일 이내 경기만 저장
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 오늘 0시로 설정

      const oneWeekLater = new Date();
      oneWeekLater.setDate(today.getDate() + 7);

      console.log(`\nChecking match: ${match.teamKo} vs ${match.opponent}`);
      console.log(`Match date: ${matchDate.toISOString()}`);
      console.log(`Today: ${today.toISOString()}`);
      console.log(`One week later: ${oneWeekLater.toISOString()}`);

      if (matchDate < today) {
        console.log('  ⏭️  Skipped: Match is in the past');
        continue;
      }

      if (matchDate > oneWeekLater) {
        console.log('  ⏭️  Skipped: Match is more than 1 week away');
        continue;
      }

      const matchData = {
        match_date: matchDate.toISOString().split('T')[0],
        match_time: matchDate.toTimeString().split(' ')[0],
        match_datetime: matchDate.toISOString(),
        opponent: match.opponent,
        tournament: match.tournament,
        league: match.league,
        match_id: match.matchId,
        updated_at: new Date().toISOString()
      };

      console.log(`  Saving to table: ${match.table}`);
      console.log(`  Data:`, JSON.stringify(matchData, null, 2));

      // upsert (insert or update)
      const { data, error } = await supabase
        .from(match.table)
        .upsert(matchData, { onConflict: 'match_id' });

      if (error) {
        console.error(`  ❌ Error saving to ${match.table}:`, error.message);
        console.error(`  Error details:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`  ✅ Saved match: ${match.teamKo} vs ${match.opponent} on ${matchData.match_date}`);
        savedCount++;
      }
    } catch (e) {
      console.error('Error saving match:', e.message);
      console.error('Stack:', e.stack);
    }
  }

  return savedCount;
}

// 메인 실행
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  scrapeSchedule()
    .then(result => {
      console.log('\n=== Scraping Result ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { scrapeSchedule };
