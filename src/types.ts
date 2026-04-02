export type Priority = 'High' | 'Medium' | 'Low' | 'Normal';
export type Platform = 'Android' | 'iOS';
export type BugStatus = 'In Testing' | 'Pending' | 'Closed';

export interface QA {
  name: string;
  platform: Platform;
}

export interface Bug {
  id: string;
  title: string;
  priority: Priority;
  platform: Platform;
  status: BugStatus;
  module: string;
  category: string;
  description: string;
  assignedTo: string;
  author: string;
  authorId: string;
  createdAt: string;
  tatExceeded: boolean;
}

export interface Team {
  lead: string;
  members: string[];
  platform: Platform;
}
