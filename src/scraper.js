import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 한국 팀 목록과 테이블 매핑
const KOREAN_TEAMS = {
  'T1': { name: '티원', table: 't1_matches' },
  '티원': { name: '티원', table: 't1_matches' },
  'Gen.G': { name: '젠지', table: 'geng_matches' },
  '젠지': { name: '젠지', table: 'geng_matches' },
  'GEN': { name: '젠지', table: 'geng_matches' },
  'Hanwha Life Esports': { name: '한화', table: 'hle_matches' },
  '한화생명': { name: '한화', table: 'hle_matches' },
  '한화생명e스포츠': { name: '한화', table: 'hle_matches' },
  'HLE': { name: '한화', table: 'hle_matches' },
  'kt 롤스터': { name: 'kt 롤스터', table: 'kt_matches' }
};

async function scrapeSchedule() {
  console.log('='.repeat(50));
  console.log('Starting LOL esports schedule scraper (Naver)...');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // 오늘부터 7일간의 경기 수집
    const matches = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 메인 스케줄 페이지로 이동
    const url = `https://game.naver.com/esports/League_of_Legends/schedule/world_championship`;
    console.log(`\nScraping from ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // 모든 날짜 카드에서 경기 수집
    const allMatches = await page.evaluate((koreanTeams) => {
      const results = [];
      const dateCards = document.querySelectorAll('.card_item__3Covz');

      dateCards.forEach(card => {
        // 날짜 추출
        const dateElement = card.querySelector('.card_date__1kdC3');
        if (!dateElement) return;

        const dateText = dateElement.textContent.trim();
        // "10월 17일 (금)" 형식에서 월과 일 추출
        const dateMatch = dateText.match(/(\d+)월\s*(\d+)일/);
        if (!dateMatch) return;

        const month = dateMatch[1].padStart(2, '0');
        const day = dateMatch[2].padStart(2, '0');
        const dateStr = `2025-${month}-${day}`;

        // 이 날짜의 모든 경기
        const items = card.querySelectorAll('li.row_item__dbJjy');

        items.forEach(item => {
          try {
            // 시간 추출
            const timeElement = item.querySelector('.row_time__28bwr');
            if (!timeElement) return;
            const time = timeElement.textContent.trim();

            // 대회명 추출
            const titleElement = item.querySelector('.row_title__1sdwN');
            const tournament = titleElement ? titleElement.textContent.trim() : 'Unknown';

            // 홈팀
            const homeNameElement = item.querySelector('.row_home__zbX5s .row_name__IDFHz');
            if (!homeNameElement) return;
            const homeName = homeNameElement.textContent.trim();

            // 원정팀
            const awayNameElement = item.querySelector('.row_away__3zJEV .row_name__IDFHz');
            if (!awayNameElement) return;
            const awayName = awayNameElement.textContent.trim();

            // TBD 경기는 건너뛰지 않고 수집 (나중에 업데이트될 수 있음)
            // 하지만 한국 팀이 나올 때만 테이블 할당
            results.push({
              team: homeName,
              teamKo: koreanTeams[homeName]?.name || homeName,
              table: koreanTeams[homeName]?.table || null,
              opponent: awayName,
              time: time,
              tournament: tournament,
              date: dateStr
            });

            results.push({
              team: awayName,
              teamKo: koreanTeams[awayName]?.name || awayName,
              table: koreanTeams[awayName]?.table || null,
              opponent: homeName,
              time: time,
              tournament: tournament,
              date: dateStr
            });
          } catch (e) {
            // 무시
          }
        });
      });

      return results;
    }, KOREAN_TEAMS);

    // 매치 ID 생성 및 오늘부터 7일 이내만 필터링
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);

    allMatches.forEach(m => {
      const matchDate = new Date(m.date);
      if (matchDate >= today && matchDate <= oneWeekLater) {
        // 날짜+시간+대회로 기본 ID 생성 (TBD가 실제 팀으로 바뀌어도 동일하게 유지)
        // 팀 관점을 구분하기 위해 team 추가
        const baseId = `${m.date}-${m.time}-${m.tournament}`.replace(/\s/g, '_');
        m.matchId = `${m.team}-${baseId}`.replace(/\s/g, '_');
        matches.push(m);
      }
    });

    console.log(`\nFiltered matches (today to +7 days):`);
    matches.forEach(m => {
      console.log(`  ${m.date} ${m.time} - ${m.teamKo} vs ${m.opponent}`);
    });

    console.log(`\nTotal matches found: ${matches.length}`);

    // Supabase에 저장
    const savedCount = await saveToSupabase(matches);
    console.log(`Saved ${savedCount} matches to Supabase`);

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

async function saveToSupabase(matches) {
  let savedCount = 0;

  console.log('\n=== Saving to Supabase ===');

  if (matches.length === 0) {
    console.log('No matches to save');
    return 0;
  }

  // 각 테이블별로 TBD 엔트리 정리
  const tablesToClean = new Set(matches.filter(m => m.table).map(m => m.table));
  for (const table of tablesToClean) {
    try {
      const { data: tbdMatches, error: fetchError } = await supabase
        .from(table)
        .select('match_id, opponent')
        .or('opponent.eq.TBD,opponent.ilike.%TBD%');

      if (!fetchError && tbdMatches && tbdMatches.length > 0) {
        console.log(`Found ${tbdMatches.length} TBD entries in ${table}`);

        // 현재 스크래핑된 데이터에서 동일한 날짜/시간/대회의 실제 매치가 있는지 확인
        for (const tbdMatch of tbdMatches) {
          const shouldDelete = matches.some(m => {
            if (!m.table || m.table !== table) return false;
            // 같은 날짜/시간/대회에 TBD가 아닌 실제 매치가 있으면 삭제
            const baseId = `${m.date}-${m.time}-${m.tournament}`.replace(/\s/g, '_');
            return tbdMatch.match_id.includes(baseId) && m.opponent !== 'TBD' && !m.opponent.includes('TBD');
          });

          if (shouldDelete) {
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('match_id', tbdMatch.match_id);

            if (!deleteError) {
              console.log(`  🗑️ Cleaned up TBD entry: ${tbdMatch.match_id}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error cleaning TBD entries from ${table}:`, e.message);
    }
  }

  for (const match of matches) {
    try {
      // 테이블이 없는 팀은 건너뛰기
      if (!match.table) {
        console.log(`Skipping: ${match.teamKo} vs ${match.opponent} (no table)`);
        continue;
      }

      // 시간 파싱 (HH:MM 형식)
      const [hour, minute] = match.time.split(':').map(Number);
      const matchDate = new Date(match.date);
      matchDate.setHours(hour, minute, 0, 0);

      const matchData = {
        match_date: match.date,
        match_time: match.time,
        match_datetime: matchDate.toISOString(),
        opponent: match.opponent,
        tournament: match.tournament,
        league: match.tournament,
        match_id: match.matchId,
        updated_at: new Date().toISOString()
      };

      console.log(`Saving: ${match.teamKo} vs ${match.opponent} on ${match.date} ${match.time}`);

      const { error } = await supabase
        .from(match.table)
        .upsert(matchData, { onConflict: 'match_id' });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Saved`);
        savedCount++;
      }
    } catch (e) {
      console.error(`Error saving match: ${e.message}`);
    }
  }

  return savedCount;
}

// 메인 실행
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

export { scrapeSchedule };
