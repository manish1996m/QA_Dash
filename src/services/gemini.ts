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

export async function getQAInsights(bugs: Bug[], snapshots: BugSnapshot[] = [], releaseContext?: string, baseScore: number = 75) {
  if (!bugs || bugs.length === 0) return null;

  if (isAiCircuitBroken()) {
    console.error("kuch toh fatt gaya [CIRCUIT BROKEN]: Maximum failures reached. AI calls suspended.");
    return null;
  }

  const key = getApiKey();
  if (!key) return null;

  const model = getModelName();

  try {
    const response = await fetch("/qa-dashboard/api/ai/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        bugs,
        snapshots,
        releaseContext,
        baseScore
      })
    });

    if (!response.ok) {
      consecutiveFailures++;
      const errorData = await response.json().catch(() => ({}));
      console.error("kuch toh fatt gaya 4", { status: response.status, errorData, consecutiveFailures });
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    consecutiveFailures = 0; // Success! Reset counter
    return data;
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

  try {
    const response = await fetch("/qa-dashboard/api/ai/assist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        bugs,
        question,
        dashboardData
      })
    });

    if (!response.ok) {
      consecutiveFailures++;
      const errorData = await response.json().catch(() => ({}));
      console.error("kuch toh fatt gaya 3", { status: response.status, errorData, consecutiveFailures });
      return `API Error: ${errorData.error || "Unknown error"}`;
    }

    const data = await response.json();
    consecutiveFailures = 0; // Success! Reset counter
    return data.answer;
  } catch (error: any) {
    consecutiveFailures++;
    console.error("kuch toh fatt gaya 5", { error, consecutiveFailures });
    return `Chat Error: ${error.message}`;
  }
}
