import { Team } from '../types';

export const TEAMS: Team[] = [
  {
    lead: 'Shubham Patel',
    members: ['Shubham Panigrahi', 'Akhileswarao Chinnari'],
    platform: 'Android'
  },
  {
    lead: 'Manish Sharma',
    members: ['Abhradeep Kanrar', 'Priyanka Chittimelli'],
    platform: 'Android'
  },
  {
    lead: 'Neha Singh',
    members: [],
    platform: 'Android'
  },
  {
    lead: 'Manish Murali',
    members: ['Aditya Rai', 'Anjali Patel', 'Freeda A Fernandes'],
    platform: 'iOS'
  }
];

export const MODULES: string[] = [
  'LMS', 'BuyLead', 'My Products', 'Buyer Webview', 'BMC', 'Login', 'My Profile', 'IM Lens'
];

export const TAT_CRITERIA: Record<string, number> = {
  High: 3,
  Medium: 7,
  Low: 15,
  Normal: 999
};
