import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { saveBugs, getAllBugs, clearBugs, queryChatbot, getSnapshots } from "./db/database";

dotenv.config();

// Mappings & Helpers
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
  return 'General';
}

function mapPriority(id: string): string {
  if (id === '9') return 'High';
  if (id === '8') return 'Medium';
  if (id === '7') return 'Low';
  return 'Normal';
}

function mapStatus(title: string, id: string): string {
  const t = title.toLowerCase().trim();
  if (id === '53' || t.includes('testing') || t.includes('qa')) return 'In Testing';
  if (t === 'closed') return 'Closed';
  if (t === 'rejected') return 'Rejected';
  if (t === 'resolved on live') return 'Resolved on Live';
  return 'Pending';
}

async function fetchWithTimeout(url: string, options: any, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function fetchProjectBugs(baseUrl: string, authHeader: string, project: string, platform: 'Android' | 'iOS') {
  const excludedStatuses = platform === 'Android'
    ? ["41", "56", "45", "67", "68", "53"]
    : ["56", "67", "68", "53", "71", "41", "45"];

  const filtersStr = encodeURIComponent(JSON.stringify([
    { "project": { "operator": "=", "values": [project] } },
    { "status": { "operator": "!", "values": excludedStatuses } },
    { "type": { "operator": "=", "values": ["7"] } }
  ]));

  const pageSize = 100;
  const projectBugs: any[] = [];
  
  const firstUrl = `${baseUrl}/api/v3/work_packages?pageSize=${pageSize}&offset=1&filters=${filtersStr}`;
  const firstRes = await fetchWithTimeout(firstUrl, { headers: { "Authorization": authHeader, "Accept": "application/json" } });
  if (!firstRes.ok) throw new Error(`${platform} Sync Failed: HTTP ${firstRes.status}`);
  
  const firstData: any = await firstRes.json();
  const total = firstData.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  
  const processItems = (items: any[]) => {
    const currentDate = new Date();
    return items.map(item => {
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

      return {
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
    });
  };

  projectBugs.push(...processItems(firstData._embedded?.elements || []));

  if (totalPages > 1) {
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const CONCURRENCY_LIMIT = 10;
    let index = 0;

    const worker = async () => {
      while (index < remainingPages.length) {
        const page = remainingPages[index++];
        if (!page) break;
        try {
          const url = `${baseUrl}/api/v3/work_packages?pageSize=${pageSize}&offset=${page}&filters=${filtersStr}`;
          const res = await fetchWithTimeout(url, { headers: { "Authorization": authHeader, "Accept": "application/json" } });
          const data = await res.json();
          projectBugs.push(...processItems(data._embedded?.elements || []));
        } catch (err) {
          console.error(`[SYNC ERROR] ${platform} Page ${page}:`, err);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY_LIMIT, remainingPages.length) }, worker));
  }

  return projectBugs;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3001");
  const BASE_PATH = "/qa-dashboard";

  // Essential for GKE/Ingress HTTPS trust
  app.set("trust proxy", 1);

  app.use(express.json({ limit: '50mb' }));
  
  // Session & Passport
  app.use(session({
    secret: process.env.SESSION_SECRET || "qa-dashboard-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  // OAUTH
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_PATH}/auth/google/callback`
    }, (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0].value;
      if (email && (email.endsWith("@intermesh.net") || email.endsWith("@indiamart.com"))) {
        return done(null, { id: profile.id, name: profile.displayName, email });
      }
      return done(null, false);
    }));
  } else {
    const CustomStrategy = (await import("passport-custom")).Strategy;
    passport.use("google", new CustomStrategy((req: any, done: any) => {
      done(null, { id: "mock-123", name: "Dev Admin", email: "dev@intermesh.net" });
    }));
  }

  // Create Router
  const router = express.Router();

  // AUTH ROUTES
  router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], successRedirect: `${BASE_PATH}/`, failureRedirect: `${BASE_PATH}/login` }));
  router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: `${BASE_PATH}/login` }), (req, res) => res.redirect(`${BASE_PATH}/`));
  router.get("/auth/logout", (req, res) => { req.logout(() => res.redirect(`${BASE_PATH}/login`)); });

  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() || req.path === "/login" || req.path === "/login/") return next();
    if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Unauthorized" });
    res.redirect(`${BASE_PATH}/login`);
  };

  // API ROUTES
  router.get("/api/db/bugs", ensureAuthenticated, (req, res) => res.json(getAllBugs()));
  router.get("/api/db/snapshots", ensureAuthenticated, (req, res) => res.json(getSnapshots(30)));
  
  router.post("/api/db/sync", ensureAuthenticated, async (req, res) => {
    const url = process.env.OPENPROJECT_URL || "https://project.intermesh.net";
    const apiKey = process.env.OPENPROJECT_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "API key missing" });
    const authHeader = `Basic ${Buffer.from(`apikey:${apiKey}`).toString("base64")}`;

    try {
      const [a, i] = await Promise.all([fetchProjectBugs(url, authHeader, "3", "Android"), fetchProjectBugs(url, authHeader, "85", "iOS")]);
      const all = [...a, ...i];
      if (all.length > 0) { clearBugs(); saveBugs(all); }
      res.json({ message: "Synced", count: all.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // AI ROUTES
  router.post("/api/ai/insights", ensureAuthenticated, async (req, res) => {
    const { model, bugs, snapshots, releaseContext, baseScore } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Gemini API Key missing" });

    try {
      const prompt = `You are a QA Lead. Analyze these bugs and historical snapshots to provide release readiness insights.
      Current Bugs: ${JSON.stringify(bugs.slice(0, 50))}
      Snapshots: ${JSON.stringify(snapshots)}
      Context: ${releaseContext || "Regular sync"}
      Base Score Goal: ${baseScore}
      
      Provide a JSON response with:
      {
        "score": number (0-100),
        "status": "Excellent" | "Good" | "Fair" | "At Risk" | "Critical",
        "summary": "detailed summary here",
        "recommendations": ["rec1", "rec2"],
        "bottlenecks": ["bot1", "bot2"]
      }`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!aiRes.ok) {
        const err = await aiRes.json();
        throw new Error(err.error?.message || "Gemini API Error");
      }

      const result = await aiRes.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      res.json(JSON.parse(text));
    } catch (e: any) {
      console.error("[AI ERROR]", e);
      res.status(500).json({ error: e.message });
    }
  });

  router.post("/api/ai/assist", ensureAuthenticated, async (req, res) => {
    const { model, question, bugs } = req.body;
    const apiKey = req.headers.authorization?.split(" ")[1];
    if (!apiKey) return res.status(401).json({ error: "Gemini API Key missing" });

    try {
      const prompt = `You are QA Assist, a bug database expert.
      Table 'bugs' schema: id, title, description, category, priority, status, platform, module, assignedTo, author, createdAt, version.
      Current Context (Sample Bugs): ${JSON.stringify(bugs.slice(0, 10))}
      
      User Question: "${question}"
      
      If the question can be answered by a SQL query, provide ONLY the SQL query starting with 'SQL:'.
      Example: 'SQL: SELECT count(*) FROM bugs WHERE priority="High"'
      
      If it's a general question, answer directly.`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!aiRes.ok) {
        const err = await aiRes.json();
        throw new Error(err.error?.message || "Gemini API Error");
      }

      const aiData = await aiRes.json();
      const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (aiText.includes("SQL:")) {
        const sql = aiText.split("SQL:")[1].trim().replace(/```sql|```/g, "").split(";")[0];
        try {
          const results = queryChatbot(sql);
          res.json({ answer: `I've analyzed the data: ${JSON.stringify(results)}. ${aiText.split("SQL:")[0]}` });
        } catch (dbErr: any) {
          res.json({ answer: `I tried to query the database but encountered an error: ${dbErr.message}` });
        }
      } else {
        res.json({ answer: aiText });
      }
    } catch (e: any) {
      console.error("[CHAT ERROR]", e);
      res.status(500).json({ error: e.message });
    }
  });

  // FRONTEND HANDLER
  const distPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(distPath)) {
    router.use(express.static(distPath));
    router.get("*", ensureAuthenticated, (req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom", base: `${BASE_PATH}/` });
    router.use(vite.middlewares);
    router.get("*", ensureAuthenticated, async (req, res) => {
      const url = req.originalUrl;
      const template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
      const transformed = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
    });
  }

  // MOUNT ROUTER
  app.use(BASE_PATH, router);
  app.get("/", (req, res) => res.redirect(BASE_PATH));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[STABLE] Hub running at http://localhost:${PORT}${BASE_PATH}`);
  });
}

startServer();
