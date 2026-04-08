process.on('unhandledRejection', (reason, promise) => {
  console.error('!!! FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('!!! FATAL: Uncaught Exception:', err);
  process.exit(1);
});

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { saveBugs, getAllBugs, clearBugs, queryChatbot, getSnapshots } from "./db/database";

dotenv.config();

// Re-use logic for mapping and module extraction
const MODULE_CATEGORY_MAPPINGS: Record<string, { iOS: string[], Android: string[] }> = {
  'LMS': { iOS: ['2113'], Android: ['1811', '664'] },
  'BMC': { iOS: ['1423'], Android: ['1410'] },
  'Login': { iOS: ['2116', '2115'], Android: ['690', '666'] },
  'PBR': { iOS: ['544', '1759'], Android: ['678'] },
  'BuyLead': { iOS: ['2114'], Android: ['1810', '645'] },
  'My Profile': { iOS: ['540'], Android: ['675'] },
  'My Products': { iOS: ['539'], Android: ['674', '1999'] },
  'Online Sales': { iOS: ['543', '522'], Android: ['677'] },
  'Buyer Webview': { iOS: ['2108'], Android: ['1819', '1820', '1818', '1817', '2106'] },
  'IM Lens': { iOS: ['2109'], Android: ['2104'] }
};

function extractModule(subject: string, categoryId: string, platform: 'Android' | 'iOS'): string {
  for (const [moduleName, ids] of Object.entries(MODULE_CATEGORY_MAPPINGS)) {
    if (platform === 'iOS' && ids.iOS.includes(categoryId)) return moduleName;
    if (platform === 'Android' && ids.Android.includes(categoryId)) return moduleName;
  }
  const otherModules = ['Foreign user', 'IM Lens'];
  for (const m of otherModules) {
    if (subject.toUpperCase().includes(m.toUpperCase())) return m;
  }
  return 'General';
}

function mapPriority(id: string): string {
  if (id === '9') return 'High';
  if (id === '8') return 'Medium';
  if (id === '7') return 'Low';
  if (id === '10') return 'Normal';
  return 'Normal';
}

function mapStatus(title: string, id: string): string {
  const t = title.toLowerCase();
  if (id === '53' || t.includes('testing') || t.includes('qa')) return 'In Testing';
  return 'Pending';
}

async function startServer() {
  console.log("Starting server process...");
  const app = express();
  const PORT = 3001;
  console.log(`Configured to use port: ${PORT}`);

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // DB Retrieve: Fetch all bugs from local database
  app.get("/api/db/bugs", (req, res) => {
    try {
      const bugs = getAllBugs();
      res.json(bugs);
    } catch (error) {
      console.error("DB Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch bugs." });
    }
  });

  // Get historical snapshots
  app.get("/api/db/snapshots", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const snapshots = getSnapshots(limit);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  // DB Sync: Fetch from OpenProject and save to local database
  app.post("/api/db/sync", async (req, res) => {
    const { url: clientUrl, apiKey: clientApiKey } = req.body;
    const url = clientUrl || process.env.OPENPROJECT_URL?.trim() || "https://project.intermesh.net";
    const apiKey = clientApiKey || process.env.OPENPROJECT_API_KEY?.trim();
    
    if (!apiKey) return res.status(401).json({ error: "API key missing" });

    const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const authHeader = `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`;

    try {
      console.log(`[SYNC] Starting sync from ${baseUrl}...`);
      const allBugs: any[] = [];
      const projects = ["3", "85"];

      for (const project of projects) {
        const platform = project === '3' ? 'Android' : 'iOS';
        // Use EXACT same filters as OpenProject UI
        // Android excludes: 41,56,45,67,68,53
        // iOS excludes: 56,67,68,53,71,41,45 (extra: 71)
        const excludedStatuses = platform === 'Android' 
          ? ["41", "56", "45", "67", "68", "53"]
          : ["56", "67", "68", "53", "71", "41", "45"];
        
        const filtersStr = encodeURIComponent(JSON.stringify([
          { "project": { "operator": "=", "values": [project] } },
          { "status": { "operator": "!", "values": excludedStatuses } },
          { "type": { "operator": "=", "values": ["7"] } }
        ]));
        
        let offset = 1;
        const pageSize = 100;
        let totalFetched = 0;
        let totalAvailable = Infinity;

        while (totalFetched < totalAvailable) {
          const fetchUrl = `${baseUrl}/api/v3/work_packages?pageSize=${pageSize}&offset=${offset}&filters=${filtersStr}`;
          const response = await fetch(fetchUrl, {
            headers: { "Authorization": authHeader, "Accept": "application/json" }
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const data: any = await response.json();
          const items = data._embedded?.elements || [];
          totalAvailable = data.total || 0;
          totalFetched += items.length;
          console.log(`[SYNC] ${platform}: page ${offset}, got ${items.length} items (${totalFetched}/${totalAvailable})`);
          
          if (items.length === 0) break;
          
          const currentDate = new Date();

          for (const item of items) {
            const statusTitle = item._links.status?.title || '';
            const statusId = item._links.status?.href?.split('/').pop() || '';

            const subject = item.subject || '';
            const priorityId = item._links.priority?.href?.split('/').pop() || '';
            const categoryId = item._links.category?.href?.split('/').pop() || '';
            
            const priority = mapPriority(priorityId);
            const createdDate = new Date(item.createdAt);
            const daysDiff = (currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            
            let tatExceeded = false;
            if (priority === 'High') tatExceeded = daysDiff > 3;
            else if (priority === 'Medium') tatExceeded = daysDiff > 7;
            else if (priority === 'Low') tatExceeded = daysDiff > 15;

            const bugData = {
              id: item.id.toString(),
              title: subject,
              description: item.description?.raw || item.description?.formatted || '',
              category: item._links.category?.title || 'General',
              priority: priority,
              status: mapStatus(statusTitle, statusId),
              platform: platform,
              module: extractModule(subject, categoryId, platform),
              assignedTo: item._links.assignee?.title || 'Unassigned',
              author: item._links.author?.title || 'Unknown',
              authorId: item._links.author?.href?.split('/').pop() || '',
              createdAt: item.createdAt,
              tatExceeded: tatExceeded,
              version: item._links.version?.title || 'None'
            };

            if (allBugs.length === 0) {
              console.log("[SYNC DEBUG] Sample Bug Data:", JSON.stringify(bugData, null, 2));
            }

            allBugs.push(bugData);
          }

          offset += 1;
        }
      }


      clearBugs();
      saveBugs(allBugs);
      console.log(`[SYNC] Complete! Saved ${allBugs.length} bugs to database.json`);
      res.json({ message: `Synced ${allBugs.length} bugs.`, count: allBugs.length });
    } catch (error: any) {
      console.error("[SYNC] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy for direct calls (kept for compatibility)
  app.get("/api/openproject/*", async (req, res) => {
    const clientUrl = req.header("x-openproject-url")?.trim();
    const clientApiKey = req.header("x-openproject-api-key")?.trim();
    const url = clientUrl || process.env.OPENPROJECT_URL?.trim() || "https://project.intermesh.net";
    const apiKey = clientApiKey || process.env.OPENPROJECT_API_KEY?.trim();
    if (!apiKey) return res.status(401).json({ error: "API key missing" });

    const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    const pathPart = req.params[0];
    const query = new URLSearchParams(req.query as any).toString();
    const targetUrl = `${baseUrl}/api/v3/${pathPart}${query ? "?" + query : ""}`;

    try {
      const response = await fetch(targetUrl, {
        headers: { "Authorization": `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`, "Accept": "application/json" }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Proxy Error" });
    }
  });

  // AI SQL Query: Execute SELECT queries from Chatbot
  app.post("/api/ai/query", async (req, res) => {
    const { sql, params } = req.body;
    if (!sql) return res.status(400).json({ error: "No SQL provided" });

    try {
      console.log(`[AI-SQL] Executing: ${sql}`);
      const results = queryChatbot(sql, params || []);
      res.json(results);
    } catch (error: any) {
      console.error("[AI-SQL] Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Serve static assets from 'dist'
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("FATAL ERROR: Failed to start server!");
  console.error(error);
  process.exit(1);
});

