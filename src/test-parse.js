import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const KOREAN_TEAMS = {
  'T1': { name: '티원', table: 't1_matches' },
  'Gen.G': { name: '젠지', table: 'geng_matches' },
  'GEN': { name: '젠지', table: 'geng_matches' },
  'Hanwha Life Esports': { name: '한화', table: 'hle_matches' },
  'HLE': { name: '한화', table: 'hle_matches' }
};

// HTML 파일 읽기
const html = readFileSync('debug.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;

console.log('Parsing debug.html...');

const sections = document.querySelectorAll('section');
console.log(`Found ${sections.length} sections`);

const matches = [];

sections.forEach((section, idx) => {
  const timeElement = section.querySelector('time');
  if (!timeElement) {
    console.log(`Section ${idx + 1}: No time element`);
    return;
  }

  const datetime = timeElement.getAttribute('datetime');
  if (!datetime) {
    console.log(`Section ${idx + 1}: No datetime`);
    return;
  }

  const teamElements = section.querySelectorAll('p');
  const teamsText = [];

  teamElements.forEach(p => {
    const text = p.textContent.trim();
    // 대문자 2-4글자 팀 코드 찾기
    const match = text.match(/\b[A-Z]{2,4}\b/);
    if (match) {
      teamsText.push(match[0]);
    }
  });

  console.log(`\nSection ${idx + 1}:`);
  console.log(`  Datetime: ${datetime}`);
  console.log(`  Teams found: ${teamsText.join(', ')}`);

  if (teamsText.length >= 2) {
    const team1 = teamsText[0];
    const team2 = teamsText[1];

    // 대회 정보
    const tournamentElements = section.querySelectorAll('p');
    let tournament = 'Unknown';
    for (const p of tournamentElements) {
      const text = p.textContent;
      if (text.includes('월드') || text.includes('챔피언십') || text.includes('LCK')) {
        tournament = text.split('•')[0].trim();
        break;
      }
    }

    console.log(`  Tournament: ${tournament}`);

    // 한국 팀 매칭
    if (KOREAN_TEAMS[team1]) {
      matches.push({
        team: team1,
        teamKo: KOREAN_TEAMS[team1].name,
        opponent: team2,
        tournament,
        datetime
      });
      console.log(`  ✓ Match: ${KOREAN_TEAMS[team1].name} vs ${team2}`);
    }

    if (KOREAN_TEAMS[team2]) {
      matches.push({
        team: team2,
        teamKo: KOREAN_TEAMS[team2].name,
        opponent: team1,
        tournament,
        datetime
      });
      console.log(`  ✓ Match: ${KOREAN_TEAMS[team2].name} vs ${team1}`);
    }
  }
});

console.log(`\n\n=== Total matches found: ${matches.length} ===`);
matches.forEach((m, idx) => {
  console.log(`${idx + 1}. ${m.teamKo} vs ${m.opponent} - ${m.tournament} (${m.datetime})`);
});
