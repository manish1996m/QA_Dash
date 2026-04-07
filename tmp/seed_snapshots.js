import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_SQLITE = path.resolve(__dirname, '../database.sqlite');
const db = new Database(DB_SQLITE);

function seedSnapshots() {
  console.log("Seeding Precise Multi-Priority Snapshots (15 Weekdays)...");
  
  // Clear existing snapshots for a clean demo
  db.prepare('DELETE FROM snapshots').run();
  
  const today = new Date();
  const snapshots = [];
  
  // Real counts for Today (April 6)
  const realToday = {
    total: 1238,
    high: 4,
    med: 225,
    low: 1009
  };

  let daysBack = 0;
  while (snapshots.length < 15) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysBack);
    
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sat (6) and Sun (0)
      
      let total, high, med, low;
      
      if (snapshots.length === 0) {
        // EXACT DATA for Today
        total = realToday.total;
        high = realToday.high;
        med = realToday.med;
        low = realToday.low;
      } else {
        // Generate historical trend scaling backwards (bugs were higher in the past)
        const progress = snapshots.length / 15;
        high = Math.floor(realToday.high + (progress * 15) + (Math.random() * 2));
        med = Math.floor(realToday.med + (progress * 50) + (Math.random() * 10));
        total = Math.floor(realToday.total + (progress * 200) + (Math.random() * 20));
        low = total - high - med;
      }
      
      const android = Math.floor(total * 0.68);
      const ios = total - android;
      
      snapshots.push({
        timestamp: d.toISOString(),
        android_count: android,
        ios_count: ios,
        high_priority_count: high,
        medium_priority_count: med,
        low_priority_count: low,
        total_count: total
      });
    }
    daysBack++;
  }

  // Sort by date ascending for insertion
  snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const insert = db.prepare(`
    INSERT INTO snapshots (
      timestamp, android_count, ios_count, high_priority_count, medium_priority_count, low_priority_count, total_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data) => {
    for (const s of data) {
      insert.run(
        s.timestamp, s.android_count, s.ios_count, 
        s.high_priority_count, s.medium_priority_count, s.low_priority_count, 
        s.total_count
      );
    }
  });

  transaction(snapshots);
  console.log(`Successfully seeded ${snapshots.length} precise snapshots! Today's totals match: ${realToday.total} (H:${realToday.high} M:${realToday.med} L:${realToday.low})`);
}

seedSnapshots();
db.close();
