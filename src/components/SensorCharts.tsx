import React, { useMemo, useState } from 'react';
import { HistoryLog } from '../types';
import { History, Calendar, Thermometer, Droplets, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DatePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const SensorCharts: React.FC<{ logs: HistoryLog[] }> = ({ logs }) => {
  const [selectedLoc, setSelectedLoc] = useState<string>('Tümü');
  const [preset, setPreset] = useState<DatePreset>('WEEK');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const sensorData = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    const withSensors = logs.filter(l => l.temp !== undefined || l.hum !== undefined);
    const sorted = [...withSensors].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group by timestamp (rounded to nearest minute to align points across sensors)
    const timeGroups: Record<number, any> = {};
    
    sorted.forEach(s => {
       const date = new Date(s.date);
       // Round to nearest minute for better visualization alignment
       const ts = date.getTime();
       
       const locStrValue = s.yeniDeger || s.eskiDeger || 'Diğer';
       const locStr = typeof locStrValue === 'string' ? locStrValue : 'Diğer';
       let locName = locStr;
       if (locStr === 'DRY_CABINET_1') {
           locName = 'Lehim Dolabı';
       } else if (locStr === 'DRY_CABINET_2') {
           locName = 'Nem Dolabı';
       } else if (locStr.startsWith('OVEN')) {
           locName = 'Kürleme Dolabı';
       }

       if (!timeGroups[ts]) {
           timeGroups[ts] = {
               timeStr: date.toLocaleString('tr-TR'),
               rawDate: ts,
               dataPoints: []
           };
       }
       timeGroups[ts][`temp_${locName}`] = s.temp;
       timeGroups[ts][`hum_${locName}`] = s.hum;
       timeGroups[ts].dataPoints.push({ locName, temp: s.temp, hum: s.hum });
    });

    return Object.values(timeGroups).sort((a: any, b: any) => a.rawDate - b.rawDate);
  }, [logs]);

  const allLocNames = useMemo(() => {
      const names = new Set<string>();
      sensorData.forEach((d: any) => {
          d.dataPoints.forEach((p: any) => {
             if (p.locName) names.add(String(p.locName));
          });
      });
      return Array.from(names).sort();
  }, [sensorData]);

  const locations = ['Tümü', ...allLocNames];

  const filteredData = useMemo(() => {
    let start = new Date(startDate);
    start.setHours(0,0,0,0);
    let end = new Date(endDate);
    end.setHours(23,59,59,999);

    if (preset === 'TODAY') {
      start = new Date();
      start.setHours(0,0,0,0);
      end = new Date();
      end.setHours(23,59,59,999);
    } else if (preset === 'WEEK') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0,0,0,0);
      end = new Date();
      end.setHours(23,59,59,999);
    } else if (preset === 'MONTH') {
      start = new Date();
      start.setMonth(start.getMonth() - 1);
      start.setHours(0,0,0,0);
      end = new Date();
      end.setHours(23,59,59,999);
    }

    return sensorData.filter((d: any) => {
      const logDate = new Date(d.rawDate);
      return logDate >= start && logDate <= end;
    });
  }, [sensorData, preset, startDate, endDate]);

  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    const now = new Date();
    if (p === 'TODAY') {
      setStartDate(now.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (p === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (p === 'MONTH') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Colors for different sensors
  const colors = [
    { temp: '#F6AD55', hum: '#63B3ED' }, // Orange, Blue
    { temp: '#F687B3', hum: '#4FD1C5' }, // Pink, Teal
    { temp: '#ECC94B', hum: '#9F7AEA' }, // Yellow, Purple
    { temp: '#68D391', hum: '#FC8181' }, // Green, Red
  ];

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="p-6 border-b border-border bg-background/20 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Sıcaklık ve Nem Geçmişi</h2>
            <p className="text-xs text-dim-foreground">Dolap ve Fırınların geçmiş sensör verileri</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-surface border border-border rounded-xl p-1">
              {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DatePreset[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${preset === p ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-dim-foreground hover:text-foreground'}`}
                >
                  {p === 'TODAY' ? 'BUGÜN' : p === 'WEEK' ? '7 GÜN' : p === 'MONTH' ? '30 GÜN' : 'ÖZEL'}
                </button>
              ))}
            </div>

            {preset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
                <Calendar size={14} className="text-dim-foreground" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-[11px] font-mono text-foreground outline-none"
                />
                <span className="text-dim-foreground">-</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-[11px] font-mono text-foreground outline-none"
                />
              </div>
            )}

            <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-1.5">
              <Filter size={14} className="text-dim-foreground" />
              <select 
                 value={selectedLoc}
                 onChange={e => setSelectedLoc(e.target.value)}
                 className="bg-transparent text-[11px] font-bold text-foreground outline-none cursor-pointer uppercase tracking-wider"
              >
                {locations.map(l => <option key={l} value={l}>{l === 'Tümü' ? 'TÜM CİHAZLAR' : l.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
       
      <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-background">
         {filteredData.length > 0 ? (
           <div className="flex flex-col gap-6 pb-12">
             {allLocNames.map((loc, idx) => {
               if (selectedLoc !== 'Tümü' && selectedLoc !== loc) return null;
               
               // Filter data only for this location to see if it has data
               const locData = filteredData.filter((d: any) => d[`temp_${loc}`] !== undefined || d[`hum_${loc}`] !== undefined);
               if (locData.length === 0) return null;

               const colorSet = colors[idx % colors.length];
               
               // Summary for this location
               const latest = locData[locData.length - 1];

               return (
                 <div key={loc} className="flex flex-col gap-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-2.5 h-6 rounded-full bg-blue-600"></div>
                       <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{loc} GRAFİĞİ</h3>
                     </div>
                     {latest && (
                       <div className="flex items-center gap-6 px-4 py-2 bg-card border border-border rounded-full shadow-sm">
                         <div className="flex items-center gap-2">
                           <Thermometer size={14} className="text-orange-400" />
                           <span className="text-[11px] font-mono text-foreground">{typeof latest[`temp_${loc}`] === 'number' ? latest[`temp_${loc}`].toFixed(1) : '0.0'}°C</span>
                         </div>
                         <div className="w-px h-3 bg-border"></div>
                         <div className="flex items-center gap-2">
                           <Droplets size={14} className="text-blue-400" />
                           <span className="text-[11px] font-mono text-foreground">{typeof latest[`hum_${loc}`] === 'number' ? latest[`hum_${loc}`].toFixed(1) : '0.0'}%</span>
                         </div>
                       </div>
                     )}
                   </div>
                   
                   <div className="bg-card border border-border-strong rounded-3xl p-6 shadow-xl h-[350px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={locData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} opacity={0.3} />
                         <XAxis 
                           dataKey="rawDate" 
                           type="number"
                           domain={['auto', 'auto']}
                           tickFormatter={(tick) => {
                               const d = new Date(tick);
                               if (preset === 'TODAY') {
                                 return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                               }
                               return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                           }}
                           stroke="#718096"
                           fontSize={10}
                           tickMargin={12}
                         />
                         <YAxis yAxisId="left" stroke={colorSet.temp} fontSize={10} tickMargin={10} domain={['auto', 'auto']} label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#718096', fontSize: '10px' } }} />
                         <YAxis yAxisId="right" orientation="right" stroke={colorSet.hum} fontSize={10} tickMargin={10} domain={['auto', 'auto']} label={{ value: '%', angle: 90, position: 'insideRight', style: { fill: '#718096', fontSize: '10px' } }} />
                         
                         <Tooltip 
                           contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                           labelFormatter={(val) => new Date(val).toLocaleString('tr-TR')}
                           itemStyle={{ padding: '2px 0' }}
                           cursor={{ stroke: '#4A5568', strokeWidth: 1 }}
                         />
                         <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                         
                         <Line 
                           yAxisId="left" 
                           type="monotone" 
                           dataKey={`temp_${loc}`} 
                           name={`${loc} Sıcaklık (°C)`} 
                           stroke={colorSet.temp} 
                           strokeWidth={2} 
                           dot={{ r: 3, strokeWidth: 2, fill: '#1A202C' }} 
                           activeDot={{ r: 5 }} 
                           connectNulls 
                         />
                         <Line 
                           yAxisId="right" 
                           type="monotone" 
                           dataKey={`hum_${loc}`} 
                           name={`${loc} Nem (%)`} 
                           stroke={colorSet.hum} 
                           strokeWidth={2} 
                           dot={{ r: 3, strokeWidth: 2, fill: '#1A202C' }} 
                           activeDot={{ r: 5 }} 
                           connectNulls 
                         />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               );
             })}
           </div>
         ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-dim-foreground gap-4">
                 <div className="w-16 h-16 rounded-full bg-surface-strong flex items-center justify-center border border-border shadow-inner">
                    <History size={32} className="opacity-20" />
                 </div>
                 <div className="text-sm font-medium">Bu cihazlar veya tarih aralığı için veri bulunamadı.</div>
                 <button 
                   onClick={() => { setSelectedLoc('Tümü'); handlePreset('WEEK'); }}
                   className="mt-2 px-6 py-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600/20 text-xs font-bold transition-colors"
                 >
                   Filtreyi Sıfırla
                 </button>
             </div>
         )}
       </div>
    </div>
  );
};

