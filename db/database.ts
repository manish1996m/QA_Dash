import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_JSON = path.join(process.cwd(), 'database.json');
const DB_SQLITE = path.join(process.cwd(), 'database.sqlite');

const db = new Database(DB_SQLITE);
db.pragma('journal_mode = WAL');

// Ensure the table exists with the correct schema
function initializeTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      category TEXT,
      priority TEXT,
      status TEXT,
      platform TEXT,
      module TEXT,
      assignedTo TEXT,
      author TEXT,
      authorId TEXT,
      createdAt TEXT,
      tatExceeded INTEGER,
      version TEXT
    )
  `);

  // Historical snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      android_count INTEGER,
      ios_count INTEGER,
      high_priority_count INTEGER,
      medium_priority_count INTEGER,
      low_priority_count INTEGER,
      total_count INTEGER
    )
  `);

  // Simple schema migration for snapshots
  const snapshotsInfo = db.pragma('table_info(snapshots)') as any[];
  if (!snapshotsInfo.some(col => col.name === 'medium_priority_count')) {
    console.log("[DB] Outdated snapshots schema detected. Recreating snapshots table...");
    db.exec(`DROP TABLE IF EXISTS snapshots`);
    db.exec(`
      CREATE TABLE snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        android_count INTEGER,
        ios_count INTEGER,
        high_priority_count INTEGER,
        medium_priority_count INTEGER,
        low_priority_count INTEGER,
        total_count INTEGER
      )
    `);
  }

  // Simple schema migration: check if 'version' exists
  const tableInfo = db.pragma('table_info(bugs)') as any[];
  const hasVersion = tableInfo.some(col => col.name === 'version');
  
  if (!hasVersion) {
    console.log("[DB] Outdated schema detected. Recreating bugs table to add 'version'...");
    db.exec(`DROP TABLE IF EXISTS bugs`);
    db.exec(`
      CREATE TABLE bugs (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        category TEXT,
        priority TEXT,
        status TEXT,
        platform TEXT,
        module TEXT,
        assignedTo TEXT,
        author TEXT,
        authorId TEXT,
        createdAt TEXT,
        tatExceeded INTEGER,
        version TEXT
      )
    `);
  }
}

initializeTable();

function migrateJsonToSqlite() {
  if (fs.existsSync(DB_JSON)) {
    try {
      const content = fs.readFileSync(DB_JSON, 'utf-8');
      const data = JSON.parse(content || '{"bugs":[]}');
      if (data.bugs && data.bugs.length > 0) {
        console.log(`[DB] Migrating ${data.bugs.length} bugs...`);
        saveBugs(data.bugs);
        fs.renameSync(DB_JSON, DB_JSON + '.bak');
      }
    } catch (e) {
      console.error("[DB] Migration error:", e);
    }
  }
}

const insertBug = db.prepare(`
  INSERT OR REPLACE INTO bugs (
    id, title, description, category, priority, status, platform, module, assignedTo, author, authorId, createdAt, tatExceeded, version
  ) VALUES (
    @id, @title, @description, @category, @priority, @status, @platform, @module, @assignedTo, @author, @authorId, @createdAt, @tatExceeded, @version
  )
`);

export function saveBugs(bugs: any[]) {
  const transaction = db.transaction((list) => {
    for (const bug of list) {
      insertBug.run({
        ...bug,
        tatExceeded: bug.tatExceeded ? 1 : 0
      });
    }
  });
  transaction(bugs);
  
  // Auto-snapshot counts after saving
  saveSnapshot();
}

export function saveSnapshot() {
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN platform = 'Android' THEN 1 ELSE 0 END) as android,
      SUM(CASE WHEN platform = 'iOS' THEN 1 ELSE 0 END) as ios,
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN priority NOT IN ('High', 'Medium') THEN 1 ELSE 0 END) as low,
      COUNT(*) as total
    FROM bugs
  `).get() as any;

  db.prepare(`
    INSERT INTO snapshots (
      android_count, ios_count, high_priority_count, medium_priority_count, low_priority_count, total_count
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    stats.android || 0, 
    stats.ios || 0, 
    stats.high || 0, 
    stats.medium || 0, 
    stats.low || 0, 
    stats.total || 0
  );
  
  console.log(`[DB] Multi-Priority Snapshot saved: Total ${stats.total} (H:${stats.high} M:${stats.medium} L:${stats.low})`);
}

export function getSnapshots(limit = 30) {
  return db.prepare(`
    SELECT * FROM snapshots 
    ORDER BY timestamp DESC 
    LIMIT ?
  `).all(limit).reverse();
}

export function getAllBugs() {
  return db.prepare('SELECT * FROM bugs').all().map((bug: any) => ({
    ...bug,
    tatExceeded: bug.tatExceeded === 1
  }));
}

export function clearBugs() {
  db.prepare('DELETE FROM bugs').run();
}

export function queryChatbot(sql: string, params: any[] = []) {
  if (!sql.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error("Only SELECT queries are allowed.");
  }
  return db.prepare(sql).all(params);
}

migrateJsonToSqlite();

