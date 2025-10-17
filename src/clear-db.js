import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TABLES = ['t1_matches', 'geng_matches', 'hle_matches'];

async function clearAllTables() {
  console.log('='.repeat(50));
  console.log('Clearing all match data from Supabase...');
  console.log('='.repeat(50));

  for (const table of TABLES) {
    try {
      console.log(`\nClearing ${table}...`);

      // 모든 데이터 삭제 (조건 없이)
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // id가 0이 아닌 모든 레코드 (즉, 전체)

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Cleared ${table}`);
      }
    } catch (e) {
      console.error(`Error clearing ${table}:`, e.message);
    }
  }

  console.log('\n=== Database cleared successfully ===');
}

clearAllTables()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
