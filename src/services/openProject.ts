import { Bug, Priority, Platform, BugStatus } from '../types';

export interface ModuleStats {
  hp_mp_count: number;
  low_count: number;
  bugs: Bug[];
}

export interface DashboardData {
  bugs: Bug[];
  global: {
    androidPending: number;
    iosPending: number;
    androidHigh: number;
    iosHigh: number;
  };
  moduleStats: Record<string, Record<Platform, ModuleStats>>;
}

export const PROJECTS = {
  ANDROID: '3',
  IOS: '85'
};

export const PRIORITIES = {
  HIGH: '9',
  MEDIUM: '8',
  LOW: '7',
  NORMAL: '10'
};

export const MODULE_CATEGORY_MAPPINGS: Record<string, { iOS: string[], Android: string[] }> = {
  'LMS': { iOS: ['529', '531', '2054'], Android: ['1811', '664', '663'] },
  'BMC': { iOS: ['1423', '535'], Android: ['1410', '649'] },
  'Login': { iOS: ['533'], Android: ['690'] },
  'PBR': { iOS: ['544', '1759'], Android: ['678'] },
  'BuyLead': { iOS: ['521', '1826'], Android: ['651', '645', '1810'] },
  'My Profile': { iOS: ['540'], Android: ['675'] },
  'My Products': { iOS: ['539'], Android: ['674', '1999'] },
  'Online Sales': { iOS: ['543', '522'], Android: ['677'] },
  'Buyer Webview': { iOS: ['2108'], Android: ['2106'] },
  'IM Lens': { iOS: [], Android: [] } // Add specific IDs if known, otherwise it will use subject fallback
};

const BASE_URL = "/api/openproject";

async function fetchBugsByFilter(
  project: "3" | "85",
  priorityType: "HPMP" | "LOW" | "NORMAL"
): Promise<{ bugs: Bug[], total: number }> {
  let priorityValues: string[] = [];
  if (priorityType === "HPMP") priorityValues = [PRIORITIES.HIGH, PRIORITIES.MEDIUM];
  else if (priorityType === "LOW") priorityValues = [PRIORITIES.LOW];
  else if (priorityType === "NORMAL") priorityValues = [PRIORITIES.NORMAL];

  const filters = [
    {
      "project": {
        "operator": "=",
        "values": [project]
      }
    },
    {
      "priority": {
        "operator": "=",
        "values": priorityValues
      }
    },
    {
      "status": {
        "operator": "o",
        "values": []
      }
    }
  ];

  let allElements: any[] = [];
  let totalCount = 0;
  const pageSize = 100;

  const filtersParam = encodeURIComponent(JSON.stringify(filters));
  let nextUrl: string | null = `${BASE_URL}/work_packages?pageSize=${pageSize}&filters=${filtersParam}`;

  while (nextUrl) {
    const response = await fetchWithRetry(nextUrl, 3, 2000);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenProject API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    totalCount = data.total || 0;

    if (data._embedded && data._embedded.elements) {
      allElements = [...allElements, ...data._embedded.elements];
    }

    if (data._links && data._links.next && allElements.length < totalCount) {
      const href = data._links.next.href;
      if (href.startsWith('/api/v3/')) {
        nextUrl = `${BASE_URL}${href.replace('/api/v3/', '/')}`;
      } else if (href.startsWith('http')) {
        const urlObj = new URL(href);
        nextUrl = `${BASE_URL}${urlObj.pathname.replace('/api/v3/', '/')}${urlObj.search}`;
      } else {
        nextUrl = `${BASE_URL}/${href.replace(/^\//, '')}`;
      }
    } else {
      nextUrl = null;
    }
  }

  console.log("Project:", project, "Priority:", priorityType, "Total:", totalCount);

  const currentDate = new Date();
  const platform: Platform = project === '3' ? 'Android' : 'iOS';

  const bugs = allElements.map((wp: any) => {
    const subject = wp.subject || '';
    const priorityTitle = wp._links.priority?.title || '';
    const priorityId = wp._links.priority?.href?.split('/').pop() || '';
    const statusTitle = wp._links.status?.title || '';
    const statusId = wp._links.status?.href?.split('/').pop() || '';
    const assigneeName = wp._links.assignee?.title || 'Unassigned';
    const categoryTitle = wp._links.category?.title || 'General';
    const categoryId = wp._links.category?.href?.split('/').pop() || '';
    const createdAt = wp.createdAt;

    const priority = mapPriority(priorityTitle, priorityId);

    // TAT Calculation
    const createdDate = new Date(createdAt);
    const daysDiff = (currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    let tatExceeded = false;
    if (priority === 'High') tatExceeded = daysDiff > 3;
    else if (priority === 'Medium') tatExceeded = daysDiff > 7;
    else if (priority === 'Low') tatExceeded = daysDiff > 15;

    return {
      id: wp.id.toString(),
      title: subject,
      priority,
      platform,
      status: mapStatus(statusTitle, statusId),
      module: extractModule(subject, categoryId, platform),
      category: categoryTitle,
      assignedTo: assigneeName,
      createdAt,
      tatExceeded
    };
  });

  return { bugs, total: totalCount };
}

async function fetchTotal(filters: any[], cardName: string): Promise<number> {
  const filtersParam = encodeURIComponent(JSON.stringify(filters));
  const url = `${BASE_URL}/work_packages?pageSize=1&filters=${filtersParam}`;

  try {
    const response = await fetchWithRetry(url, 3, 2000);
    if (!response.ok) {
      console.error(`Error fetching total for ${cardName}:`, response.status);
      return 0;
    }
    const data = await response.json();
    console.log("Card:", cardName, "Total:", data.total);
    return data.total || 0;
  } catch (error) {
    console.error(`Error fetching total for ${cardName}:`, error);
    return 0;
  }
}

export async function fetchBugs(): Promise<DashboardData> {
  try {
    // Define filters for the 4 specific cards as per user request
    const androidPendingFilters = [
      { "project": { "operator": "=", "values": ["3"] } },
      { "status": { "operator": "!", "values": ["41", "56", "45", "67", "68", "53"] } },
      { "type": { "operator": "=", "values": ["7"] } }
    ];

    const iosPendingFilters = [
      { "project": { "operator": "=", "values": ["85"] } },
      { "status": { "operator": "!", "values": ["56", "45", "67", "68", "53", "41"] } },
      { "type": { "operator": "=", "values": ["7"] } }
    ];

    const androidHighPendingFilters = [
      { "project": { "operator": "=", "values": ["3"] } },
      { "status": { "operator": "!", "values": ["41", "56", "45", "67", "68", "53"] } },
      { "type": { "operator": "=", "values": ["7"] } },
      { "priority": { "operator": "=", "values": ["9"] } }
    ];

    const iosHighPendingFilters = [
      { "project": { "operator": "=", "values": ["85"] } },
      { "status": { "operator": "!", "values": ["56", "45", "67", "68", "53", "41"] } },
      { "type": { "operator": "=", "values": ["7"] } },
      { "priority": { "operator": "=", "values": ["9"] } }
    ];

    const [
      androidHPMP, androidLOW, androidNORMAL,
      iosHPMP, iosLOW, iosNORMAL,
      androidPendingTotal, iosPendingTotal, androidHighTotal, iosHighTotal
    ] = await Promise.all([
      fetchBugsByFilter("3", "HPMP"),
      fetchBugsByFilter("3", "LOW"),
      fetchBugsByFilter("3", "NORMAL"),
      fetchBugsByFilter("85", "HPMP"),
      fetchBugsByFilter("85", "LOW"),
      fetchBugsByFilter("85", "NORMAL"),
      fetchTotal(androidPendingFilters, "Android Pending"),
      fetchTotal(iosPendingFilters, "iOS Pending"),
      fetchTotal(androidHighPendingFilters, "Android High Pending"),
      fetchTotal(iosHighPendingFilters, "iOS High Pending")
    ]);

    const allBugs = [
      ...androidHPMP.bugs,
      ...androidLOW.bugs,
      ...androidNORMAL.bugs,
      ...iosHPMP.bugs,
      ...iosLOW.bugs,
      ...iosNORMAL.bugs
    ];

    const dashboardData: DashboardData = {
      bugs: allBugs,
      global: {
        androidPending: androidPendingTotal,
        iosPending: iosPendingTotal,
        androidHigh: androidHighTotal,
        iosHigh: iosHighTotal,
      },
      moduleStats: {}
    };

    // Initialize module stats
    Object.keys(MODULE_CATEGORY_MAPPINGS).forEach(moduleName => {
      dashboardData.moduleStats[moduleName] = {
        Android: { hp_mp_count: 0, low_count: 0, bugs: [] },
        iOS: { hp_mp_count: 0, low_count: 0, bugs: [] }
      };
    });

    // Group bugs by module
    allBugs.forEach(bug => {
      const moduleName = bug.module;
      if (dashboardData.moduleStats[moduleName]) {
        const stats = dashboardData.moduleStats[moduleName][bug.platform];
        stats.bugs.push(bug);
        if (bug.priority === 'High' || bug.priority === 'Medium') {
          stats.hp_mp_count++;
        } else if (bug.priority === 'Low') {
          stats.low_count++;
        }
      }
    });

    return dashboardData;
  } catch (error) {
    console.error('OpenProject Fetch Error:', error);
    throw error;
  }
}

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  const customUrl = localStorage.getItem('openproject_url');
  const customKey = localStorage.getItem('openproject_api_key');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (customUrl) headers['x-openproject-url'] = customUrl;
  if (customKey) headers['x-openproject-api-key'] = customKey;

  let lastResponse: Response | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers });
      if (response.ok) return response;
      lastResponse = response;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
    await new Promise(r => setTimeout(r, delay));
  }

  let errorDetail = "";
  if (lastResponse) {
    try {
      const data = await lastResponse.json();
      errorDetail = data.error || data.message || JSON.stringify(data);
    } catch (e) {
      try {
        errorDetail = await lastResponse.text();
      } catch (inner) {
        errorDetail = "Could not read error response body";
      }
    }
  }

  const status = lastResponse?.status;
  const statusText = lastResponse?.statusText || "";
  throw new Error(`API Error (${status} ${statusText}): ${errorDetail || 'Check your settings'}`);
}

function mapPriority(title: string, id: string): Priority {
  // Mapping based on OpenProject priority IDs:
  // 9: Immediate -> Mapped to 'High'
  // 8: Urgent -> Mapped to 'Medium'
  // 7: Low -> Mapped to 'Low'
  // 10: Normal -> Mapped to 'Normal'
  if (id === '9') return 'High';
  if (id === '8') return 'Medium';
  if (id === '7') return 'Low';
  if (id === '10') return 'Normal';

  // Fallback to title if ID doesn't match known ones
  const t = title.toLowerCase();
  if (t.includes('immediate') || t.includes('high')) return 'High';
  if (t.includes('urgent') || t.includes('medium')) return 'Medium';
  if (t.includes('low')) return 'Low';

  return 'Normal';
}

function mapStatus(title: string, id: string): BugStatus {
  const t = title.toLowerCase();
  // Status 53 is explicitly "In Testing"
  if (id === '53' || t.includes('testing') || t.includes('qa')) return 'In Testing';
  return 'Pending';
}

function extractModule(subject: string, categoryId: string, platform: Platform): string {
  for (const [moduleName, ids] of Object.entries(MODULE_CATEGORY_MAPPINGS)) {
    if (platform === 'iOS' && ids.iOS.includes(categoryId)) return moduleName;
    if (platform === 'Android' && ids.Android.includes(categoryId)) return moduleName;
  }

  // Fallback for other modules or if category ID is missing
  const otherModules = ['Foreign user', 'IM Lens'];
  for (const m of otherModules) {
    if (subject.toUpperCase().includes(m.toUpperCase())) return m;
  }

  return 'General';
}
