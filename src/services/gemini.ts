import { Bug } from "../types";
import { DashboardData, BugSnapshot } from "./openProject";

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
    As a Senior QA Manager at IndiaMART, you are tasked with providing a CRITICAL and ACCURATE Release Readiness analysis.
    
    ${releaseContext ? `FOCUS RELEASE: ${releaseContext}` : 'SCOPE: Global (All Projects & Releases)'}

    CURRENT BUG DATA:
    Total Pending: ${bugs.length}
    - HIGH Priority: ${bugs.filter(b => b.priority === 'High').length}
    - MEDIUM Priority: ${bugs.filter(b => b.priority === 'Medium').length}
    - LOW/Normal Priority: ${bugs.filter(b => b.priority === 'Low' || b.priority === 'Normal').length}
    
    GUIDANCE:
    Based on raw metrics, a mathematical Base Score is: ${baseScore}%
    Use this as your starting reference point. If you deviate more than 10%, explain why in your reasoning.

    SCORING RUBRIC (MANDATORY):
    - 100%: ZERO pending bugs of any priority.
    - 90-99%: NO High/Medium bugs. Only a few Low/Normal bugs remaining.
    - 75-89%: NO High bugs. 1-5 Medium bugs (manageable risk).
    - 50-74%: NO High bugs, but 5-15 Medium bugs or high volume of Low bugs.
    - <50%: ONE OR MORE High priority bugs exist, OR excessive Medium bugs (>15).
    
    TASK:
    1. EXPLAIN YOUR REASONING FIRST (Chain of Thought). Evaluate the impact of each bug.
    2. Determine the final Readiness Score (0-100).
    3. Identify the primary bottleneck and its impact.
    4. Provide 3 proactive, actionable recommendations.

    Format your response AS RAW JSON (no markdown fences):
    {
      "reasoning": "Step-by-step evaluation of the bugs, project context, and math behind the score.",
      "readinessScore": number (0-100),
      "bottleneck": "string",
      "riskLevel": "High | Medium | Low",
      "trend": "string",
      "analysis": "markdown string (summary for UI)",
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
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (error) {
    console.error("LLM API Error:", error);
    return null;
  }
}

export async function askQAAssist(bugs: Bug[], question: string, dashboardData?: DashboardData | null): Promise<string> {
  if (!bugs || bugs.length === 0) return "I don't have any bug data. Please click 'Sync Data' to fetch data from OpenProject!";

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
      const errorData = await response.json();
      return `API Error: ${errorData.error?.message || "Unknown error"}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("LLM Chat Error:", error);
    return `Chat Error: ${error.message}`;
  }
}
