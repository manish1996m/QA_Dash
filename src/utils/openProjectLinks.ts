import { Platform } from '../types';
import { PROJECTS, PRIORITIES, MODULE_CATEGORY_MAPPINGS } from '../services/openProject';

export { PRIORITIES };

export const getModuleLinks = (moduleName: string, platform: Platform) => {
  const projectSlug = platform === 'Android' ? 'android' : 'iosnative';
  const baseUrl = `https://project.intermesh.net/projects/${projectSlug}/work_packages`;
  const categoryIds = MODULE_CATEGORY_MAPPINGS[moduleName]?.[platform] || [];
  
  const androidExcludedStatuses = ["41", "56", "45", "67", "68", "53"];
  const iosExcludedStatuses = ["56", "67", "68", "53", "71", "41", "45"];
  
  let c: string[];
  let hi: boolean;
  let g: string;
  let t: string;
  
  if (platform === 'Android') {
    c = ["id", "subject", "priority", "author", "category", "version", "customField6", "type", "status"];
    hi = false;
    g = "category";
    t = "category:desc,priority:asc,id:asc";
  } else {
    c = ["id", "project", "subject", "type", "parent", "status", "priority", "author", "assignee", "responsible", "updatedAt", "category", "version", "createdAt", "customField1", "storyPoints", "remainingTime", "position"];
    hi = true;
    g = "";
    t = "id:asc";
  }

  const excludedStatuses = platform === 'Android' ? androidExcludedStatuses : iosExcludedStatuses;
  
  const getQueryProps = (priorities: string[], tatDays?: string) => {
    const filters: any[] = [
      { n: "status", o: "!", v: excludedStatuses },
      { n: "type", o: "=", v: ["7"] },
      { n: "priority", o: "=", v: priorities }
    ];

    if (tatDays) {
      filters.push({ n: "createdAt", o: "<t-", v: [tatDays] });
    }

    if (categoryIds.length > 0) {
      filters.push({ n: "category", o: "=", v: categoryIds });
    } else {
      filters.push({ n: "subject", o: "~", v: [moduleName] });
    }

    return {
      c, hi, g, is: true, tv: false, hl: "none", t,
      f: filters,
      pp: 100,
      pa: 1
    };
  };

  return {
    hp_mp: `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(getQueryProps([PRIORITIES.HIGH, PRIORITIES.MEDIUM])))}`,
    low: `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(getQueryProps([PRIORITIES.LOW])))}`,
    tatHigh: `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(getQueryProps([PRIORITIES.HIGH], "3")))}`,
    tatMedium: `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(getQueryProps([PRIORITIES.MEDIUM], "7")))}`,
    tatLow: `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(getQueryProps([PRIORITIES.LOW], "15")))}`
  };
};

export const getGlobalLink = (platform: Platform, highOnly: boolean = false) => {
  const projectId = platform === 'Android' ? PROJECTS.ANDROID : PROJECTS.IOS;
  const baseUrl = `https://project.intermesh.net/projects/${projectId}/work_packages`;
  
  const androidExcludedStatuses = ["41", "56", "45", "67", "68", "53"];
  const iosExcludedStatuses = ["56", "67", "68", "53", "71", "41", "45"];
  const excludedStatuses = platform === 'Android' ? androidExcludedStatuses : iosExcludedStatuses;

  const filters: any[] = [
    { n: "status", o: "!", v: excludedStatuses },
    { n: "type", o: "=", v: ["7"] }
  ];

  if (highOnly) {
    filters.push({ n: "priority", o: "=", v: [PRIORITIES.HIGH] });
  }

  const queryProps = {
    c: ["id", "subject", "priority", "author", "category", "type", "status"],
    hi: false,
    g: "category",
    is: true,
    tv: false,
    hl: "none",
    t: "category:desc,priority:asc,id:asc",
    f: filters,
    pp: 100,
    pa: 1
  };

  return `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(queryProps))}`;
};

export const getPeriodicLink = (platform: Platform, days: string, priority?: string | string[], tatDays?: string) => {
  const projectId = platform === 'Android' ? PROJECTS.ANDROID : PROJECTS.IOS;
  const baseUrl = `https://project.intermesh.net/projects/${projectId}/work_packages`;
  
  const androidExcludedStatuses = ["41", "56", "45", "67", "68", "53"];
  const iosExcludedStatuses = ["56", "67", "68", "53", "71", "41", "45"];
  const excludedStatuses = platform === 'Android' ? androidExcludedStatuses : iosExcludedStatuses;

  const filters: any[] = [
    { n: "status", o: "!", v: excludedStatuses },
    { n: "type", o: "=", v: ["7"] },
    { n: "createdAt", o: ">t-", v: [days] } // Bugs created in the last X days
  ];

  if (tatDays) {
    filters.push({ n: "createdAt", o: "<t-", v: [tatDays] });
  }

  if (priority) {
    filters.push({ n: "priority", o: "=", v: Array.isArray(priority) ? priority : [priority] });
  }

  const queryProps = {
    c: ["id", "subject", "priority", "author", "category", "version", "type", "status", "createdAt"],
    hi: false,
    g: "category",
    is: true,
    tv: false,
    hl: "none",
    t: "createdAt:desc,priority:asc,id:asc",
    f: filters,
    pp: 100,
    pa: 1
  };

  return `${baseUrl}?query_props=${encodeURIComponent(JSON.stringify(queryProps))}`;
};
