https://lolesports.com/ko-KR/leagues/first_stand,lck,msi,worlds

위 링크에서 롤(LOL) 경기 일정을 스크래핑해서 각 팀별로 날짜, 상대팀, 대회명을 Supabase에 저장.

SUPABASE_URL=https://gcjwitsvfolvgvsyolde.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjandpdHN2Zm9sdmd2c3lvbGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjUyNTgsImV4cCI6MjA3MTE0MTI1OH0.2GKhMz3SJQYpyr9IHpDQ8W5LFZKB3x7DL2_lOToqPyo

각 팀별로 매일 오전 9시마다 오늘 경기가 있는지 체크하여 디스코드 웹훅을 통해 알림 메세지를 전송.

티원: 
https://discord.com/api/webhooks/1428672936134447156/eIiP1pG9ssS_0s_NdmqeDs8ZB59gWRDa0blViL2_FpGrLYFuMdkBSg9xQPfQKiY3Xw9R

젠지: https://discord.com/api/webhooks/1428672531111481401/0vODPPHIwEcaSKQkI8DJR7yNXLdxAR1mJv1L-HNdRjxvHvmTSCxto9fcJ5jINPyU-thO

한화:
https://discord.com/api/webhooks/1428673286363025409/L8-ZBF-aW2t5-VSu8RGP8EP69djccsmv0zVKNcJrii914df-FjauFJpzs0HZkmgyRrKG

반복적인 일을 하기 위해 gitgub actions를 이용해 cron jobs를 수행한다.

- 데이터를 스크래핑 하는 것은 시간마다 오전 8시를 포함해 4시간마다 반복하여 오늘부터 1주일 후까지의 데이터를 수집하고 변경점이 있으면 데이터베이스를 업데이트한다.

- 매일 오전 9시마다 각 팀별로 오늘 경기가 있다면 해당하는 팀의 웹훅으로 디스코드 메세지를 전송한다.
예시: "오늘 [오전/오후] [Hour]시 [우리팀 이름] VS [상대팀 이름] [대회명] 경기가 있습니다."

각 팀별로 supabase table 을 만드는 sql 쿼리를 md 파일로 작성할 것.

웹훅 링크들, 데이터 스크래핑하는 링크, supabase key 는 github actions 에서 환경변수로 관리 (public repo 이므로 공개되지 않도록)

