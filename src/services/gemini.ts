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

async function callGemini(prompt: string) {
  const key = getApiKey();
  const model = getModelName();
  if (!key) throw new Error("Missing Gemini API Key");

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
  return data.candidates[0].content.parts[0].text;
}

export async function getQAInsights(bugs: Bug[], snapshots: any[] = []) {
  if (!bugs || bugs.length === 0) return null;
  
  try {
    const bugSummary = bugs.map(b => ({
      priority: b.priority,
      status: b.status,
      platform: b.platform,
      category: b.category,
      module: b.module
    }));

    const trendSummary = snapshots.slice(-7).map(s => ({
      date: s.timestamp,
      total: s.total_count,
      high: s.high_priority_count
    }));

    // Pre-calculate counts to ensure prompt accuracy
    const highCount = snapshots[snapshots.length - 1]?.high_priority_count || 0;
    const mediumCount = snapshots[snapshots.length - 1]?.medium_priority_count || 0;
    const lowCount = snapshots[snapshots.length - 1]?.low_priority_count || 0;

    const prompt = `
      As a Senior QA Manager, analyze this bug summary AND historical trend from IndiaMART's QA Dashboard.
      
      CURRENT STATS:
      - High Priority Bugs: ${highCount}
      - Medium Priority Bugs: ${mediumCount}
      - Low Priority Bugs: ${lowCount}
      
      HISTORICAL TREND (Last 15 snapshots):
      ${JSON.stringify(trendSummary)}
      
      CRITICAL RULE:
      Calculate a "Release Readiness Score" (0-100%) based ONLY on High (H) and Medium (M) bugs.
      
      SCORING LOGIC (STRICT):
      1. START at 100.
      2. DEDUCT -15% for EVERY single High Priority bug.
      3. DEDUCT -2% for EVERY single Medium Priority bug.
      4. IGNORE Low Priority bugs (they do not affect readiness).
      5. The score CANNOT be 100% if High > 0 or Medium > 5.
      6. If calculation goes below 0, return 0.
      
      Based on the velocity (how fast bugs are being resolved or added), provide:
      1. A concise bottleneck analysis.
      2. A Risk Level and Score.
      3. A "Trend" description (Improving/Degrading/Stagnant).
      4. Strategic Recommendations.
      5. A PREDICTED DATE (approximate) when HIGH+MEDIUM bug count will reach zero.
      6. A "readinessScore" (0 to 100) based ONLY on H and M priority data.
      
      Format response AS RAW JSON:
      {
        "bottleneck": "string",
        "riskLevel": "High | Medium | Low",
        "riskScore": number (1-3),
        "readinessScore": number (0-100),
        "trend": "string",
        "analysis": "markdown string (include the Predicted Zero-Bug Date and Readiness analysis here)",
        "recommendations": ["string", "string", "string"]
      }
    `;

    const text = await callGemini(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return null;
  }
}

export async function askQAAssist(bugs: Bug[], question: string, dashboardData?: DashboardData | null): Promise<string> {
  if (!bugs || bugs.length === 0) return "No bug data available. Please sync first!";
  
  const key = getApiKey();
  if (!key) return "Please provide a Gemini API Key in Settings.";

  const schemaContext = `
    Table: bugs
    Columns: id, title, description, category, priority, status, platform, module, assignedTo, author, createdAt, tatExceeded (1 or 0)
    
    Platform values: 'Android', 'iOS'
    Priority values: 'High', 'Medium', 'Low', 'Normal'
    Status values: 'Pending', 'In Testing'
  `;

  try {
    // Step 1: Reasoning - Decide if we need SQL
    const reasoningPrompt = `
      You are "QA Assist" for IndiaMART. 
      Database Schema:
      ${schemaContext}
      
      User Question: "${question}"
      
      If the question requires counting, listing, or specific data from the database, respond ONLY with a JSON object:
      {"sql": "SELECT ..."}
      
      Otherwise, if it's a general greeting or non-data question, respond with the answer directly.
      
      IMPORTANT:
      - Use 'LIKE' for module or category names if unsure.
      - 'tatExceeded = 1' means TAT is exceeded.
      - Always return results related to the user's question.
    `;

    const firstResponse = await callGemini(reasoningPrompt);
    
    let sqlMatch = null;
    try {
      const parsed = JSON.parse(firstResponse.match(/\{[\s\S]*\}/)?.[0] || firstResponse);
      if (parsed.sql) sqlMatch = parsed.sql;
    } catch (e) {
      // Not JSON, probably a direct answer
      return firstResponse;
    }

    if (sqlMatch) {
      // Step 2: Execute SQL via backend
      const queryResponse = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlMatch })
      });

      if (!queryResponse.ok) {
        const err = await queryResponse.json();
        throw new Error(err.error || "Query failed");
      }

      const dbResults = await queryResponse.json();

      // Step 3: Final Answer
      const finalPrompt = `
        User Question: "${question}"
        Database Results: ${JSON.stringify(dbResults)}
        
        Provide a friendly, accurate answer based ONLY on the data above. 
        If counts are requested, give the exact numbers from the results.
        If no data was found, explain that politely.
      `;

      return await callGemini(finalPrompt);
    }

    return firstResponse;
  } catch (error: any) {
    console.error("QA Assist Error:", error);
    return `Error: ${error.message}. I might be having trouble connecting to the database!`;
  }
}
