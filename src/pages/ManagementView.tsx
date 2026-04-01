import React from 'react';
import { Smartphone, Apple, AlertCircle, Activity } from 'lucide-react';
import { Bug } from '../types';
import { StatCard } from '../components/ui/StatCard';

interface ManagementViewProps {
  bugs: Bug[];
  stats: {
    total: number;
    inTesting: number;
    pending: number;
    highPriority: number;
    android: number;
    ios: number;
  };
}

export const ManagementView: React.FC<ManagementViewProps> = ({ bugs, stats }) => {
  const androidPending = bugs.filter(b => b.platform === 'Android' && b.status === 'Pending').length;
  const iosPending = bugs.filter(b => b.platform === 'iOS' && b.status === 'Pending').length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-4 gap-6">
        <StatCard 
          label="Android Pending" 
          value={androidPending} 
          icon={<Smartphone className="w-5 h-5 text-blue-600" />}
        />
        <StatCard 
          label="iOS Pending" 
          value={iosPending} 
          icon={<Apple className="w-5 h-5 text-blue-600" />}
        />
        <StatCard 
          label="High Priority" 
          value={stats.highPriority} 
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
        />
        <StatCard 
          label="In Testing" 
          value={stats.inTesting} 
          icon={<Activity className="w-5 h-5 text-teal-600" />}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Bug List</h3>
          <span className="text-xs text-gray-400 font-bold">{bugs.length} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Module</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bugs.map((bug) => (
                <tr key={bug.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{bug.id}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">{bug.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      bug.priority === 'High' ? 'bg-red-50 text-red-600' :
                      bug.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {bug.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {bug.platform === 'Android' ? <Smartphone className="w-3 h-3" /> : <Apple className="w-3 h-3" />}
                      {bug.platform}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${
                      bug.status === 'In Testing' ? 'text-teal-600' : 'text-amber-600'
                    }`}>
                      {bug.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-bold uppercase tracking-wider">{bug.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
