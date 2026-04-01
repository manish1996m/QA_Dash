import React from 'react';

interface HeaderProps {
  pendingCount: number;
  highPriorityCount: number;
}

export const Header: React.FC<HeaderProps> = ({ pendingCount, highPriorityCount }) => {
  return (
    <header className="p-8 border-b border-gray-100 bg-white flex justify-between items-end">
      <div>
        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-1">Dashboard</div>
        <h2 className="text-3xl font-bold text-gray-800">Global Metrics</h2>
      </div>
      <div className="flex gap-8">
        <div className="text-right">
          <div className="text-xs font-bold text-gray-400">Total Pending</div>
          <div className="text-3xl font-bold text-gray-800">{pendingCount}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-400">High Priority</div>
          <div className="text-3xl font-bold text-red-600">{highPriorityCount}</div>
        </div>
      </div>
    </header>
  );
};
