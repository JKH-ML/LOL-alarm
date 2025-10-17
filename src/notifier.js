import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 팀별 웹훅 URL
const TEAM_WEBHOOKS = {
  't1_matches': {
    name: '티원',
    webhook: process.env.T1_WEBHOOK_URL
  },
  'geng_matches': {
    name: '젠지',
    webhook: process.env.GENG_WEBHOOK_URL
  },
  'hle_matches': {
    name: '한화',
    webhook: process.env.HLE_WEBHOOK_URL
  }
};

async function sendDiscordNotification(webhookUrl, message) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        username: 'LOL 경기 알림봇'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}

function formatMatchMessage(teamName, match) {
  const matchDate = new Date(match.match_datetime);

  // 한국 시간으로 변환
  const koreaTime = new Date(matchDate.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

  const hour = koreaTime.getHours();
  const minute = koreaTime.getMinutes();

  // 오전/오후 구분
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  // 분 표시 (00이 아닌 경우만)
  const timeStr = minute === 0
    ? `${period} ${displayHour}시`
    : `${period} ${displayHour}시 ${minute}분`;

  return `오늘 ${timeStr} ${teamName} VS ${match.opponent} ${match.tournament} 경기가 있습니다.`;
}

async function checkAndNotify() {
  console.log('Checking today\'s matches...');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let totalNotifications = 0;

  // 각 팀별로 확인
  for (const [tableName, teamInfo] of Object.entries(TEAM_WEBHOOKS)) {
    try {
      console.log(`Checking ${teamInfo.name} matches...`);

      // 오늘 경기 조회
      const { data: matches, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('match_date', todayStr)
        .order('match_datetime', { ascending: true });

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        continue;
      }

      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} match(es) for ${teamInfo.name}`);

        // 모든 오늘 경기에 대해 알림
        for (const match of matches) {
          const message = formatMatchMessage(teamInfo.name, match);
          console.log(`Sending notification: ${message}`);

          const success = await sendDiscordNotification(teamInfo.webhook, message);

          if (success) {
            console.log(`✓ Notification sent for ${teamInfo.name}`);
            totalNotifications++;
          } else {
            console.log(`✗ Failed to send notification for ${teamInfo.name}`);
          }

          // Discord rate limit 방지 (1초 대기)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        console.log(`No matches today for ${teamInfo.name}`);
      }
    } catch (error) {
      console.error(`Error processing ${teamInfo.name}:`, error);
    }
  }

  console.log(`\nTotal notifications sent: ${totalNotifications}`);
  return totalNotifications;
}

// 메인 실행
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  checkAndNotify()
    .then(count => {
      console.log(`\n=== Notification completed: ${count} sent ===`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { checkAndNotify };
