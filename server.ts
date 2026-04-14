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
  const t = title.toLowerCase().trim();

  if (id === '53' || t.includes('testing') || t.includes('qa')) return 'In Testing';

  // Categorize specific resolved/closed states instead of blindly assigning 'Pending'
  if (t === 'closed') return 'Closed';
  if (t === 'bugs treatment') return 'Bugs Treatment';
  if (t === 'rejected') return 'Rejected';
  if (t === 'resolved on live') return 'Resolved on Live';
  if (t === 'tested and rca accepted') return 'Tested and RCA Accepted';

  // Only true open/working states are marked as pending
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

  const LLM_BASE_URL = "https://imllm.intermesh.net/v1";

  // AI Endpoint: Release Readiness JSON Insight
  app.post("/api/ai/insights", async (req, res) => {
    const { bugs, snapshots, releaseContext, baseScore = 75, model = 'gemini-1.5-flash' } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "API key missing in Authorization header" });

    if (!bugs || bugs.length === 0) return res.json(null);

    const prompt = `
      As a Senior QA Manager at IndiaMART, provide a CRITICAL Release Readiness analysis via JSON.
      
      ${releaseContext ? `FOCUS RELEASE: ${releaseContext}` : 'SCOPE: Global (All Projects & Releases)'}

      CURRENT BUG DATA SUMMARY:
      Total Pending: ${bugs.length}
      - HIGH Priority: ${bugs.filter((b: any) => b.priority === 'High').length}
      - MEDIUM Priority: ${bugs.filter((b: any) => b.priority === 'Medium').length}
      - LOW/Normal Priority: ${bugs.filter((b: any) => b.priority === 'Low' || b.priority === 'Normal').length}
      
      MATHEMATICAL BASE SCORE: ${baseScore}%
      (This is your starting point. High bugs MUST drop the score below 50%)

      SCORING RUBRIC (STRICT):
      - 100%: ZERO pending bugs.
      - 90-99%: NO High/Medium bugs. Only a few Low/Normal bugs.
      - 75-89%: NO High bugs. 1-5 Medium bugs.
      - 50-74%: NO High bugs, but 5-15 Medium bugs.
      - <50%: ONE OR MORE High priority bugs exist OR >15 Medium bugs.
      - 0-10%: CRITICAL state (Blockers exist).

      TASK:
      1. EXPLAIN YOUR REASONING: Evaluate bug impact and explain deviations from baseScore.
      2. Determine final Readiness Score (0-100).
      3. Identify primary bottleneck.
      4. Provide 3 proactive, actionable recommendations.

      Format your response AS RAW JSON (strictly no markdown, no other text):
      {
        "reasoning": "string",
        "readinessScore": number,
        "bottleneck": "string",
        "riskLevel": "High | Medium | Low",
        "trend": "string",
        "analysis": "markdown string",
        "recommendations": ["string", "string", "string"]
      }
    `;

    try {
      const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader },
        body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }], temperature: 0.2 })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: errorData.error?.message || `API Error: ${response.status}` });
      }

      const data = await response.json();
      let text = data.choices[0].message.content.trim();

      if (text.startsWith('\`\`\`')) text = text.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');

      try {
        res.json(JSON.parse(text));
      } catch (parseError) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse LLM JSON" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Endpoint: Chatbot QA Assist
  app.post("/api/ai/assist", async (req, res) => {
    const { bugs, question, dashboardData, model = 'gemini-1.5-flash' } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "API key missing in Authorization header" });

    if (!bugs || bugs.length === 0) return res.json({ answer: "I don't have any bug data. Please click 'Sync Data' to fetch data from OpenProject!" });

    const categoryMap: Record<string, { Android: number, iOS: number }> = {};
    const assigneeMap: Record<string, { total: number, high: number, medium: number, low: number }> = {};

    bugs.forEach((b: any) => {
      const cat = b.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = { Android: 0, iOS: 0 };
      categoryMap[cat][b.platform as 'Android' | 'iOS']++;

      const assignee = b.assignedTo || 'Unassigned';
      if (!assigneeMap[assignee]) assigneeMap[assignee] = { total: 0, high: 0, medium: 0, low: 0 };
      assigneeMap[assignee].total++;
      if (b.priority === 'High') assigneeMap[assignee].high++;
      else if (b.priority === 'Medium') assigneeMap[assignee].medium++;
      else assigneeMap[assignee].low++;
    });

    const prompt = `
      You are "QA Assist", an expert QA manager for IndiaMART.
      You have 100% access to the database-backed bug data via the summaries below.
      
      OFFICIAL DASHBOARD STATS:
      - Android Total: ${dashboardData?.global?.androidPending || 0}
      - iOS Total: ${dashboardData?.global?.iosPending || 0}
      - Android High: ${dashboardData?.global?.androidHigh || 0}
      - iOS High: ${dashboardData?.global?.iosHigh || 0}
      
      DETAILED ASSIGNEE ROSTER (Who holds what bugs):
      ${Object.entries(assigneeMap).sort((a, b) => b[1].total - a[1].total).map(([n, c]) => `- ${n}: ${c.total} total bugs (High: ${c.high}, Medium: ${c.medium}, Low: ${c.low})`).join('\n')}

      DETAILED CATEGORY BREAKDOWN:
      ${Object.entries(categoryMap).map(([cat, counts]) => `- ${cat}: [Android: ${counts.Android}, iOS: ${counts.iOS}]`).join('\n')}
      
      RICH CONTEXT (Latest 150 bugs with descriptions):
      ${bugs.slice(0, 150).map((b: any) => `- [${b.platform}] [Priority: ${b.priority}] [Assignee: ${b.assignedTo}] ${b.title}: ${b.description?.substring(0, 150)}...`).join('\n')}
      
      User Question: "${question}"
      
      GUIDELINES:
      - Be accurate with counts. Use the Assignee Roster meticulously.
    `;

    try {
      const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader },
        body: JSON.stringify({ model: model, messages: [{ role: "user", content: prompt }] })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: errorData.error?.message || "Unknown error" });
      }

      const data = await response.json();
      res.json({ answer: data.choices[0].message.content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

