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

  const bugSummary = bugs.map(b => ({
    title: b.title,
    priority: b.priority,
    status: b.status,
    platform: b.platform,
    category: b.category,
    assignedTo: b.assignedTo
  }));

  const prompt = `
    As a Senior QA Manager, analyze the following bug data from IndiaMART's QA Insight Dashboard.
    Provide a concise summary of the current QA state, identify the top 3 risks, and suggest 3 immediate actions.
    
    Data:
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

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

export async function askQAAssist(bugs: Bug[], question: string, dashboardData?: DashboardData | null): Promise<string> {
  if (!bugs || bugs.length === 0) return "I don't have any bug data to analyze yet. Please make sure your OpenProject settings are correct!";

  const key = getApiKey();
  if (!key) return "Please provide a Gemini API Key in the Settings menu to enable the QA Assist chatbot.";

  const model = getModelName();

  // Create a truly dynamic Category Map for both Android and iOS
  const categoryMap: Record<string, { Android: number, iOS: number }> = {};

  bugs.forEach(b => {
    const cat = b.category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = { Android: 0, iOS: 0 };
    categoryMap[cat][b.platform]++;
  });

  const summary = {
    officialTotals: {
      androidPending: dashboardData?.global.androidPending || 0,
      iosPending: dashboardData?.global.iosPending || 0,
      androidHighPriority: dashboardData?.global.androidHigh || 0,
      iosHighPriority: dashboardData?.global.iosHigh || 0,
    },
    totalBugsFetched: bugs.length,
    categoryStats: categoryMap,
    recentSample: bugs.map(b => `${b.platform}: ${b.title} [Cat: ${b.category}] (${b.priority}, ${b.status}, Assigned to: ${b.assignedTo})`).slice(0, 30)
  };

  const prompt = `
    You are "QA Assist", an expert QA manager for IndiaMART.
    
    You have been provided with a COMPREHENSIVE statistical map of all bugs across both Android and iOS.
    
    CRITICAL INSTRUCTIONS:
    1. For category questions (e.g. "LMS", "Login", "Webview"): Look at the CATEGORY STATS below. 
    2. BE LOGICAL: If a user asks for "LMS", you must SUM UP all categories that contain the word "LMS" (e.g. "LMS-BL" + "LMS webview").
    3. Be platform-specific: Always distinguish between Android and iOS counts.
    4. Use the OFFICIAL TOTALS for general project-wide health questions.
    
    OFFICIAL DASHBOARD TOTALS:
    - Android Total Pending: ${summary.officialTotals.androidPending}
    - iOS Total Pending: ${summary.officialTotals.iosPending}
    - Android High Priority: ${summary.officialTotals.androidHighPriority}
    - iOS High Priority: ${summary.officialTotals.iosHighPriority}
    
    CATEGORY STATS (Complete Map for both platforms):
    ${Object.entries(summary.categoryStats).map(([cat, counts]) => `- ${cat}: [Android: ${counts.Android}, iOS: ${counts.iOS}]`).join('\n')}
    
    RECENT BUG LIST (Sample for specific detail context):
    ${summary.recentSample.join('\n')}
    
    User Question: "${question}"
    
    Answer concisely. Be professional, logical, and friendly. If multiple categories match the user's query, sum them up and explain which ones you included.
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
      const msg = errorData.error?.message || "Unknown error";
      return `API Error (${response.status}): ${msg}`;
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    return `Chat Error: ${error.message || "Failed to reach AI server."}`;
  }
}
