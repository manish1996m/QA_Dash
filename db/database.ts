import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to read/write JSON
function readDb() {
  if (!fs.existsSync(DB_FILE)) return { bugs: [] };
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(content || '{"bugs":[]}');
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function saveBugs(bugs: any[]) {
  const db = readDb();
  // Map incoming data to our schema if needed
  const mappedBugs = bugs.map(bug => ({
    ...bug,
    tatExceeded: bug.tatExceeded ? true : false
  }));
  
  // Use a map to ensure unique IDs (INSERT OR REPLACE behavior)
  const bugMap = new Map();
  db.bugs.forEach((b: any) => bugMap.set(b.id, b));
  mappedBugs.forEach(b => bugMap.set(b.id, b));
  
  if (mappedBugs.length > 0) {
    console.log("[DB DEBUG] Saving bugs with keys:", Object.keys(mappedBugs[0]));
  }
  
  writeDb({ bugs: Array.from(bugMap.values()) });
}

export function getAllBugs() {
  const db = readDb();
  return db.bugs;
}

export function clearBugs() {
  writeDb({ bugs: [] });
}
