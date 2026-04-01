import { Bug, Priority } from '../types';
import { TAT_CRITERIA } from '../constants';

export function calculateTATExceeded(bugs: Bug[], category: 'High' | 'Medium' | 'Low') {
  const now = new Date();
  const thresholds = {
    High: 3,
    Medium: 7,
    Low: 15
  };
  const thresholdDays = thresholds[category];
  
  return bugs.filter(b => {
    if (!b.createdAt) return false;
    const createdDate = new Date(b.createdAt);
    if (isNaN(createdDate.getTime())) return false;
    
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > thresholdDays;
  }).length;
}
