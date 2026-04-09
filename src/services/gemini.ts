import { Bug } from "../types";
import { DashboardData, BugSnapshot } from "./openProject";

// Circuit Breaker State (Resets on page refresh)
let consecutiveFailures = 0;
const MAX_FAILURES = 20;

export function isAiCircuitBroken() {
  return consecutiveFailures >= MAX_FAILURES;
}

export function resetAiCircuit() {
  consecutiveFailures = 0;
}

// Helper to get the API key
function getApiKey() {
  return localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY || "";
}

// Helper to get the Model name
function getModelName() {
  return localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
}

const LLM_BASE_URL = "https://imllm.intermesh.net/v1";

export async function getQAInsights(bugs: Bug[], snapshots: BugSnapshot[] = [], releaseContext?: string, baseScore: number = 75) {
  if (!bugs || bugs.length === 0) return null;

  if (isAiCircuitBroken()) {
    console.error("kuch toh fatt gaya [CIRCUIT BROKEN]: Maximum failures reached. AI calls suspended.");
    return null;
  }

  const key = getApiKey();
  if (!key) return null;

  const model = getModelName();

  // Create a balanced sample for general insights
  const bugSummary = bugs.map(b => ({
    title: b.title,
    priority: b.priority,
    status: b.status,
    platform: b.platform,
    category: b.category,
    module: b.module,
    version: b.version
  }));

  const trendContext = snapshots && snapshots.length > 0
    ? `Historical Trend (last 15 snapshots): ${JSON.stringify(snapshots.slice(-15))}`
    : "No historical trend data available yet.";

  const prompt = `
    As a Senior QA Manager at IndiaMART, provide a CRITICAL Release Readiness analysis via JSON.
    
    ${releaseContext ? `FOCUS RELEASE: ${releaseContext}` : 'SCOPE: Global (All Projects & Releases)'}

    CURRENT BUG DATA SUMMARY:
    Total Pending: ${bugs.length}
    - HIGH Priority: ${bugs.filter(b => b.priority === 'High').length}
    - MEDIUM Priority: ${bugs.filter(b => b.priority === 'Medium').length}
    - LOW/Normal Priority: ${bugs.filter(b => b.priority === 'Low' || b.priority === 'Normal').length}
    
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
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      consecutiveFailures++;
      const errorData = await response.json().catch(() => ({}));
      console.error("kuch toh fatt gaya 4", { status: response.status, errorData, consecutiveFailures });
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.choices[0].message.content.trim();

    // Clean up markdown code blocks if the LLM includes them
    if (text.startsWith('```')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(text);
      consecutiveFailures = 0; // Success! Reset counter
      return parsed;
    } catch (parseError) {
      console.error("kuch toh fatt gaya 1", "JSON Parse Error on text:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        consecutiveFailures = 0; // Success! Reset counter
        return JSON.parse(jsonMatch[0]);
      }
      throw parseError;
    }
  } catch (error) {
    consecutiveFailures++;
    console.error("kuch toh fatt gaya 2", { error, consecutiveFailures });
    return null;
  }
}

export async function askQAAssist(bugs: Bug[], question: string, dashboardData?: DashboardData | null): Promise<string> {
  if (!bugs || bugs.length === 0) return "I don't have any bug data. Please click 'Sync Data' to fetch data from OpenProject!";

  if (isAiCircuitBroken()) {
    return "AI System Suspended: Please refresh the page to try again.";
  }

  const key = getApiKey();
  if (!key) return "Please provide an API Key in Settings.";

  const model = getModelName();

  // Generate dynamic category & status stats from the local DB data
  const categoryMap: Record<string, { Android: number, iOS: number }> = {};
  const assigneeMap: Record<string, { total: number, high: number, medium: number, low: number }> = {};

  bugs.forEach(b => {
    // Category mapping
    const cat = b.category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = { Android: 0, iOS: 0 };
    categoryMap[cat][b.platform as 'Android' | 'iOS']++;

    // Assignee mapping
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
    - Android Total: ${dashboardData?.global.androidPending || 0}
    - iOS Total: ${dashboardData?.global.iosPending || 0}
    - Android High: ${dashboardData?.global.androidHigh || 0}
    - iOS High: ${dashboardData?.global.iosHigh || 0}
    
    DETAILED ASSIGNEE ROSTER (Who holds what bugs):
    ${Object.entries(assigneeMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, counts]) => `- ${name}: ${counts.total} total bugs (High: ${counts.high}, Medium: ${counts.medium}, Low: ${counts.low})`)
      .join('\n')}

    DETAILED CATEGORY BREAKDOWN:
    ${Object.entries(categoryMap).map(([cat, counts]) => `- ${cat}: [Android: ${counts.Android}, iOS: ${counts.iOS}]`).join('\n')}
    
    RICH CONTEXT (Latest 150 bugs with descriptions):
    ${bugs.slice(0, 150).map(b => `- [${b.platform}] [Priority: ${b.priority}] [Assignee: ${b.assignedTo}] ${b.title}: ${b.description?.substring(0, 150)}...`).join('\n')}
    
    User Question: "${question}"
    
    GUIDELINES:
    1. If the user asks for "LMS", sum up all LMS-related categories.
    2. If the user asks about the "details" or "description" of a bug, use the Rich Context above.
    3. Be extremely accurate with counts. Use the Assignee Roster meticulously when asked "how many bugs are with X".
    4. If the user asks about something not in the sample, refer to the Category Breakdown or Assignee Roster.
  `;

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      consecutiveFailures++;
      const errorData = await response.json().catch(() => ({}));
      console.error("kuch toh fatt gaya 3", { status: response.status, errorData, consecutiveFailures });
      return `API Error: ${errorData.error?.message || "Unknown error"}`;
    }

    const data = await response.json();
    consecutiveFailures = 0; // Success! Reset counter
    return data.choices[0].message.content;
  } catch (error: any) {
    consecutiveFailures++;
    console.error("kuch toh fatt gaya 5", { error, consecutiveFailures });
    return `Chat Error: ${error.message}`;
  }
}
