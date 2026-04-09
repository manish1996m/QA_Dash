import { Bug, Priority, Platform, BugStatus } from '../types';

export interface ModuleStats {
  hp_mp_count: number;
  low_count: number;
  bugs: Bug[];
}

export interface BugSnapshot {
  id: number;
  timestamp: string;
  android_count: number;
  ios_count: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  total_count: number;
  isFallback?: boolean;
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

export async function syncBugs(): Promise<{ message: string, count: number }> {
  const url = '/api/db/sync';
  const body = {
    url: localStorage.getItem('openproject_url'),
    apiKey: localStorage.getItem('openproject_api_key')
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("kuch toh fatt gaya 6", { status: response.status, url, error: err });
    throw new Error(err.error || 'Sync failed');
  }

  return response.json();
}

export async function fetchSnapshots(limit: number = 30): Promise<BugSnapshot[]> {
  const response = await fetch(`/api/db/snapshots?limit=${limit}`);
  if (!response.ok) {
    console.error("kuch toh fatt gaya 7", { status: response.status, url: '/api/db/snapshots' });
    throw new Error('Failed to fetch snapshots');
  }
  return response.json();
}

export async function fetchBugs(): Promise<DashboardData> {
  const response = await fetch('/api/db/bugs');
  if (!response.ok) {
    console.error("kuch toh fatt gaya 8", { status: response.status, url: '/api/db/bugs' });
    throw new Error('Failed to fetch from local database');
  }

  const allBugs: Bug[] = await response.json();

  // Calculate stats from the loaded database bugs
  const androidPending = allBugs.filter(b => b.platform === 'Android' && b.status === 'Pending').length;
  const iosPending = allBugs.filter(b => b.platform === 'iOS' && b.status === 'Pending').length;
  const androidHigh = allBugs.filter(b => b.platform === 'Android' && b.priority === 'High' && b.status === 'Pending').length;
  const iosHigh = allBugs.filter(b => b.platform === 'iOS' && b.priority === 'High' && b.status === 'Pending').length;

  const dashboardData: DashboardData = {
    bugs: allBugs,
    global: {
      androidPending,
      iosPending,
      androidHigh,
      iosHigh,
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
      const stats = dashboardData.moduleStats[moduleName][bug.platform as Platform];
      stats.bugs.push(bug);
      if (bug.priority === 'High' || bug.priority === 'Medium') {
        stats.hp_mp_count++;
      } else if (bug.priority === 'Low') {
        stats.low_count++;
      }
    }
  });

  return dashboardData;
}

