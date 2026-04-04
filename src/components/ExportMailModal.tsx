import React, { useRef, useState } from 'react';
import { X, Copy, Mail, Check } from 'lucide-react';
import { Platform, Bug } from '../types';
import { DashboardData } from '../services/openProject';
import { getModuleLinks } from '../utils/openProjectLinks';
import { calculateTATExceeded } from '../utils/tat';

interface ExportMailModalProps {
  moduleName: string;
  dashboardData: DashboardData;
  onClose: () => void;
}

export function ExportMailModal({ moduleName, dashboardData, onClose }: ExportMailModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const androidStats = dashboardData.moduleStats[moduleName]?.Android;
  const iosStats = dashboardData.moduleStats[moduleName]?.iOS;

  // Calculate totals by priority
  const androidHigh = androidStats?.bugs.filter(b => b.priority === 'High').length || 0;
  const androidMedium = androidStats?.bugs.filter(b => b.priority === 'Medium').length || 0;
  const androidLow = androidStats?.low_count || 0;

  const iosHigh = iosStats?.bugs.filter(b => b.priority === 'High').length || 0;
  const iosMedium = iosStats?.bugs.filter(b => b.priority === 'Medium').length || 0;
  const iosLow = iosStats?.low_count || 0;

  // Calculate TAT
  const androidTatHigh = calculateTATExceeded(androidStats?.bugs || [], 'High');
  const androidTatMedium = calculateTATExceeded(androidStats?.bugs || [], 'Medium');
  const androidTatLow = calculateTATExceeded(androidStats?.bugs || [], 'Low');

  const iosTatHigh = calculateTATExceeded(iosStats?.bugs || [], 'High');
  const iosTatMedium = calculateTATExceeded(iosStats?.bugs || [], 'Medium');
  const iosTatLow = calculateTATExceeded(iosStats?.bugs || [], 'Low');

  const androidLinks = getModuleLinks(moduleName, 'Android');
  const iosLinks = getModuleLinks(moduleName, 'iOS');

  // Generic Email table styling
  const tableStyles = {
    borderCollapse: 'collapse' as const,
    width: '100%',
    maxWidth: '600px',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #d1d5db',
    marginBottom: '20px',
    marginLeft: 'auto',
    marginRight: 'auto'
  };

  const headerCellStyle = {
    padding: '10px',
    border: '1px solid #d1d5db',
    textAlign: 'center' as const,
  };

  const cellStyle = {
    padding: '10px',
    border: '1px solid #d1d5db',
    textAlign: 'center' as const,
  };

  const getPriorityStyle = (priority: string) => ({
    padding: '10px',
    border: '1px solid #d1d5db',
    textAlign: 'center' as const,
    fontWeight: 'bold',
    color: priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#16a34a'
  });

  const getAStyle = () => ({
    color: '#2563eb',
    textDecoration: 'underline'
  });

  const handleCopyAndMail = async () => {
    if (!contentRef.current) return;
    try {
      const htmlContent = contentRef.current.innerHTML;
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([contentRef.current.innerText], { type: 'text/plain' });
      
      const item = new window.ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      // Open mail client
      const subject = `${moduleName} PENDING BUGS - iOS + Android`;
      const body = `Hi Team,\n\nPlease find the ${moduleName} pending bugs report.\n\n[PASTE HERE]\n\nRegards,\nQA Dashboard`;
      window.location.href = `mailto:spoc@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">Export Report: {moduleName}</h2>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate">Copy and paste this report into your email client.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-im-red hover:bg-red-50 hover:border-red-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-slate-50/30 custom-scrollbar">
            {/* The Email Content that will be copied */}
            <div 
              ref={contentRef} 
              className="bg-white p-4 sm:p-8 rounded-xl border border-slate-200 shadow-sm overflow-x-auto"
              style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img 
                  src="https://i.ibb.co/XfPrR2yX/indiamart-seeklogo.png" 
                  alt="IndiaMart Logo" 
                  style={{ height: '50px', display: 'inline-block' }} 
                />
              </div>
              <h2 style={{ textAlign: 'center', color: '#2e3192', fontSize: '22px', borderBottom: '2px solid #2e3192', paddingBottom: '10px', marginBottom: '20px', textTransform: 'uppercase' }}>
                {moduleName} PENDING BUGS - iOS + Android
              </h2>

              {/* Priority Table */}
              <table style={tableStyles}>
                <thead>
                  <tr style={{ backgroundColor: '#3b5998', color: 'white' }}>
                    <th colSpan={3} style={headerCellStyle}>Total {moduleName} Pending Bugs</th>
                  </tr>
                  <tr style={{ backgroundColor: '#f3f4f6', color: 'black', fontWeight: 'bold' }}>
                    <td style={headerCellStyle}>Priority</td>
                    <td style={headerCellStyle}>iOS</td>
                    <td style={headerCellStyle}>Android</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={getPriorityStyle('High')}>High</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.hp_mp} style={getAStyle()}>{iosHigh}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.hp_mp} style={getAStyle()}>{androidHigh}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style={getPriorityStyle('Medium')}>Medium</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.hp_mp} style={getAStyle()}>{iosMedium}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.hp_mp} style={getAStyle()}>{androidMedium}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style={getPriorityStyle('Low')}>Low</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.low} style={getAStyle()}>{iosLow}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.low} style={getAStyle()}>{androidLow}</a>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TAT Missing Table */}
              <table style={tableStyles}>
                <thead>
                  <tr style={{ backgroundColor: '#3b5998', color: 'white' }}>
                    <th colSpan={3} style={headerCellStyle}>TAT Exceeded Summary (Pending)</th>
                  </tr>
                  <tr style={{ backgroundColor: '#f3f4f6', color: 'black', fontWeight: 'bold' }}>
                    <td style={headerCellStyle}>Priority</td>
                    <td style={headerCellStyle}>iOS</td>
                    <td style={headerCellStyle}>Android</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={getPriorityStyle('High')}>High (&gt;3d)</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.tatHigh} style={getAStyle()}>{iosTatHigh}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.tatHigh} style={getAStyle()}>{androidTatHigh}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style={getPriorityStyle('Medium')}>Medium (&gt;7d)</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.tatMedium} style={getAStyle()}>{iosTatMedium}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.tatMedium} style={getAStyle()}>{androidTatMedium}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style={getPriorityStyle('Low')}>Low (&gt;15d)</td>
                    <td style={cellStyle}>
                      <a href={iosLinks.tatLow} style={getAStyle()}>{iosTatLow}</a>
                    </td>
                    <td style={cellStyle}>
                      <a href={androidLinks.tatLow} style={getAStyle()}>{androidTatLow}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic', marginTop: '10px' }}>
                Note: Click on any number to view the detailed bugs list in OpenProject.
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyAndMail}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-white shadow-md order-1 sm:order-2 ${
                copied 
                  ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' 
                  : 'bg-im-blue hover:bg-im-blue-dark shadow-im-blue/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Opening Mail...</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Copy & Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
