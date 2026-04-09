import React, { useRef, useState } from 'react';
import { X, Copy, Check, BarChart3, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { getPeriodicLink, PRIORITIES } from '../utils/openProjectLinks';
import { cn } from '../utils/cn';

interface ExportWorkloadModalProps {
  stats: any;
  type: 'weekly' | 'monthly';
  onClose: () => void;
}

export function ExportWorkloadModal({ stats, type, onClose }: ExportWorkloadModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const isWeekly = type === 'weekly';

  // Styling for the HTML report
  const tableStyles = {
    borderCollapse: 'collapse' as const,
    width: '100%',
    maxWidth: '700px',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #e5e7eb',
    marginBottom: '20px',
    marginLeft: 'auto',
    marginRight: 'auto'
  };

  const headerStyle = {
    backgroundColor: isWeekly ? '#334155' : '#2e3192',
    color: 'white',
    padding: '12px',
    textAlign: 'center' as const,
    fontSize: '16px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const
  };

  const subHeaderStyle = {
    backgroundColor: '#f8fafc',
    color: '#475569',
    padding: '10px',
    border: '1px solid #e5e7eb',
    textAlign: 'center' as const,
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const
  };

  const cellStyle = {
    padding: '10px',
    border: '1px solid #e5e7eb',
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#1e293b'
  };

  const labelCellStyle = {
    ...cellStyle,
    textAlign: 'left' as const,
    fontWeight: 'bold',
    backgroundColor: '#fcfcfc',
    width: '50%'
  };

  const valueCellStyle = (color?: string) => ({
    ...cellStyle,
    fontWeight: 'black',
    color: color || '#1e293b',
    width: '50%'
  });

  const aStyle = (color?: string) => ({
    color: color || '#2e3192',
    textDecoration: 'none',
    fontWeight: 'bold'
  });

  const handleCopy = async () => {
    if (!contentRef.current) return;
    try {
      const htmlContent = contentRef.current.innerHTML;
      const plainText = contentRef.current.innerText;
      
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      
      const item = new window.ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy. Please try again.');
    }
  };

  const statsToUse = isWeekly ? stats.weekly : stats.monthly;
  const daysString = isWeekly ? '7' : '30';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl text-white", isWeekly ? "bg-slate-600" : "bg-im-blue")}>
              {isWeekly ? <Calendar className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {isWeekly ? 'Weekly' : 'Monthly'} QA Productivity Report
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Leadership Summary Preview</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 transition-colors text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content (Preview) */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/30">
          <div 
            ref={contentRef}
            className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Branding Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <img 
                src="https://i.ibb.co/XfPrR2yX/indiamart-seeklogo.png" 
                alt="IndiaMART" 
                style={{ height: '45px', marginBottom: '15px' }} 
              />
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.5px' }}>
                {isWeekly ? 'Weekly' : 'Monthly'} QA Intelligence Summary
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Range: Last {daysString} Days | Generated on {format(new Date(), 'dd MMMM yyyy')}
              </div>
            </div>

            {/* Velocity Section */}
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th colSpan={2} style={headerStyle}>
                    📱 Android Velocity (Last {daysString}d)
                  </th>
                </tr>
                <tr>
                  <td style={subHeaderStyle}>Performance Metric</td>
                  <td style={subHeaderStyle}>Count (Raised)</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={labelCellStyle}>Total Raising</td>
                  <td style={valueCellStyle()}>
                    <a href={getPeriodicLink('Android', daysString)} style={aStyle()}>{statsToUse.android}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>High Priority (HP)</td>
                  <td style={valueCellStyle('#dc2626')}>
                    <a href={getPeriodicLink('Android', daysString, PRIORITIES.HIGH)} style={aStyle('#dc2626')}>{statsToUse.hpAndroid}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>Medium Priority (MP)</td>
                  <td style={valueCellStyle('#d97706')}>
                    <a href={getPeriodicLink('Android', daysString, PRIORITIES.MEDIUM)} style={aStyle('#d97706')}>{statsToUse.mpAndroid}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>Low Priority (LP)</td>
                  <td style={valueCellStyle('#16a34a')}>
                    <a href={getPeriodicLink('Android', daysString, PRIORITIES.LOW)} style={aStyle('#16a34a')}>{statsToUse.lpAndroid}</a>
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={tableStyles}>
              <thead>
                <tr>
                  <th colSpan={2} style={headerStyle}>
                    🍎 iOS Velocity (Last {daysString}d)
                  </th>
                </tr>
                <tr>
                  <td style={subHeaderStyle}>Performance Metric</td>
                  <td style={subHeaderStyle}>Count (Raised)</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={labelCellStyle}>Total Raising</td>
                  <td style={valueCellStyle()}>
                    <a href={getPeriodicLink('iOS', daysString)} style={aStyle()}>{statsToUse.ios}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>High Priority (HP)</td>
                  <td style={valueCellStyle('#dc2626')}>
                    <a href={getPeriodicLink('iOS', daysString, PRIORITIES.HIGH)} style={aStyle('#dc2626')}>{statsToUse.hpIos}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>Medium Priority (MP)</td>
                  <td style={valueCellStyle('#d97706')}>
                    <a href={getPeriodicLink('iOS', daysString, PRIORITIES.MEDIUM)} style={aStyle('#d97706')}>{statsToUse.mpIos}</a>
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>Low Priority (LP)</td>
                  <td style={valueCellStyle('#16a34a')}>
                    <a href={getPeriodicLink('iOS', daysString, PRIORITIES.LOW)} style={aStyle('#16a34a')}>{statsToUse.lpIos}</a>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* NEW TAT MISSED SECTION - ONLY SHOWN IN MONTHLY REPORT */}
            {!isWeekly && (
              <>
                <table style={tableStyles}>
                  <thead>
                    <tr>
                      <th colSpan={2} style={{ ...headerStyle, backgroundColor: '#dc2626' }}>
                        📊 Android TAT Compliance (Missed)
                      </th>
                    </tr>
                    <tr>
                      <td style={subHeaderStyle}>Priority Threshold</td>
                      <td style={subHeaderStyle}>Missed Count</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={labelCellStyle}>High Priority (&gt;3 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('Android', '30', PRIORITIES.HIGH, '3')} style={aStyle('#dc2626')}>{stats.tatSummary.android.hp}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style={labelCellStyle}>Medium Priority (&gt;7 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('Android', '30', PRIORITIES.MEDIUM, '7')} style={aStyle('#dc2626')}>{stats.tatSummary.android.mp}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style={labelCellStyle}>Low Priority (&gt;15 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('Android', '30', PRIORITIES.LOW, '15')} style={aStyle('#dc2626')}>{stats.tatSummary.android.lp}</a>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={tableStyles}>
                  <thead>
                    <tr>
                      <th colSpan={2} style={{ ...headerStyle, backgroundColor: '#dc2626' }}>
                        📊 iOS TAT Compliance (Missed)
                      </th>
                    </tr>
                    <tr>
                      <td style={subHeaderStyle}>Priority Threshold</td>
                      <td style={subHeaderStyle}>Missed Count</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={labelCellStyle}>High Priority (&gt;3 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('iOS', '30', PRIORITIES.HIGH, '3')} style={aStyle('#dc2626')}>{stats.tatSummary.ios.hp}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style={labelCellStyle}>Medium Priority (&gt;7 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('iOS', '30', PRIORITIES.MEDIUM, '7')} style={aStyle('#dc2626')}>{stats.tatSummary.ios.mp}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style={labelCellStyle}>Low Priority (&gt;15 Days)</td>
                      <td style={valueCellStyle('#dc2626')}>
                        <a href={getPeriodicLink('iOS', '30', PRIORITIES.LOW, '15')} style={aStyle('#dc2626')}>{stats.tatSummary.ios.lp}</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
              Range: All metrics scoped to the last {isWeekly ? '7' : '30'} days raised data.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 max-w-sm">
            {isWeekly 
              ? "Weekly report focuses on raising velocity across platforms." 
              : "Monthly report includes both velocity and TAT compliance summary."}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-all text-white shadow-lg",
                copied ? "bg-emerald-500 shadow-emerald-500/20" : "bg-im-blue hover:bg-im-blue-dark shadow-im-blue/20 active:scale-95"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy {isWeekly ? 'Weekly' : 'Monthly'} Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
