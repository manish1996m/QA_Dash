import { Bug } from "../types";
import { DashboardData } from "./openProject";

// Helper to get the API key
function getApiKey() {
  return localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY || "";
}

// Helper to get the Model name
function getModelName() {
  return localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
}

export async function getQAInsights(bugs: Bug[]) {
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
    module: b.module
  }));

  const prompt = `
    As a Senior QA Manager, analyze the following bug summary from IndiaMART's QA Insight Dashboard.
    Provide a concise summary of the current QA state, identify the top 3 risks, and suggest 3 immediate actions.
    
    Data Summary:
    ${JSON.stringify(bugSummary.slice(0, 50))} 
    
    Format your response AS RAW JSON with the following structure (no markdown fences):
    {
      "bottleneck": "string",
      "riskLevel": "High | Medium | Low",
      "riskScore": number (1-3),
      "trend": "string",
      "analysis": "markdown string",
      "recommendations": ["string", "string", "string"]
    }
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

export async function askQAAssist(bugs: Bug[], question: string, dashboardData?: DashboardData | null): Promise<string> {
  if (!bugs || bugs.length === 0) return "I don't have any bug data. Please click 'Sync Data' to fetch data from OpenProject!";

  const key = getApiKey();
  if (!key) return "Please provide a Gemini API Key in Settings.";

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
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return `API Error: ${errorData.error?.message || "Unknown error"}`;
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return `Chat Error: ${error.message}`;
  }
}
