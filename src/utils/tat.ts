import { Bug, Priority } from '../types';
import { TAT_CRITERIA } from '../constants';

export function calculateTATExceeded(bugs: Bug[], category: 'High' | 'Medium' | 'Low') {
  return bugs.filter(b => b.priority === category && b.tatExceeded).length;
}
