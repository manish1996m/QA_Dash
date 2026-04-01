import React from 'react';
import { ExternalLink } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  link?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, link }) => {
  return (
    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col gap-2 relative group">
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-xs uppercase font-bold tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      {link && (
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
};
