"use client"

import { useParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ZoneDataPoint {
    time: string;
    gas: number;
    temp: number;
    risk: number;
}

export default function ZoneDetail() {
    const { id } = useParams();
    const [data, setData] = useState<ZoneDataPoint[]>([]);
    const [forecast, setForecast] = useState<any[]>([]);
    const [healthReport, setHealthReport] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            // 1. Fetch readings
            const { data: readings } = await supabase
                .from('sensor_readings')
                .select('*')
                .eq('zone_id', id)
                .order('created_at', { ascending: false })
                .limit(50);

            // 2. Fetch predictions
            const { data: predictions } = await supabase
                .from('predictions')
                .select('*')
                .eq('zone_id', id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (readings && predictions) {
                const formatted = readings.map((r: any, i: number) => {
                    const pred = predictions[i];
                    return {
                        time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        gas: r.gas_ppm,
                        temp: r.temperature,
                        risk: (pred?.risk_score || 0) * 100
                    };
                }).reverse();
                setData(formatted);
            }

            // 3. Fetch Forecast
            try {
                const res = await fetch(`http://localhost:8000/api/forecast/${id}`);
                const forecastData = await res.json();
                if (Array.isArray(forecastData)) {
                    setForecast(forecastData);
                }
            } catch (e) {
                console.error("Failed to fetch forecast", e);
            }
        };

        fetchData();

        // Subscribe to updates for this zone
        const channel = supabase
            .channel(`zone-${id}-detail`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `zone_id=eq.${id}` },
                () => fetchData()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const fetchHealthReport = async () => {
            setIsAnalyzing(true);
            try {
                const res = await fetch(`http://localhost:8000/api/health-report/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const reportData = await res.json();
                if (reportData.report) {
                    setHealthReport(reportData.report);
                } else {
                    setHealthReport('AI analysis unavailable at this moment.');
                }
            } catch (e) {
                setHealthReport('Error: Could not connect to AI Health Service.');
            } finally {
                setIsAnalyzing(false);
            }
        };

        fetchHealthReport();
        const interval = setInterval(fetchHealthReport, 60000);

        return () => clearInterval(interval);
    }, [id]);

    return (
        <div className="container mx-auto p-8 max-w-7xl">
            <div className="mb-8">
                <a href="/" className="text-slate-400 hover:text-white transition-colors mb-4 inline-block">← Back to Dashboard</a>
                <h1 className="text-4xl font-bold text-white mb-2">Zone {id} Analytics</h1>
                <p className="text-slate-400">Deep dive into environmental metrics</p>
            </div>

            <div className="grid gap-8">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl rounded-2xl p-6 h-96">
                    <h3 className="text-lg font-medium text-white mb-6">Gas Concentration (PPM)</h3>
                    <div className="h-[calc(100%-3rem)] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#94a3b8' }} />
                                <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area type="monotone" dataKey="gas" stroke="#f59e0b" fillOpacity={1} fill="url(#colorGas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-6 h-80">
                        <h3 className="text-lg font-medium text-white mb-6">Temperature Trend</h3>
                        <div className="h-[calc(100%-3rem)] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" hide />
                                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                    <Area type="monotone" dataKey="temp" stroke="#ec4899" strokeWidth={2} fill="url(#colorTemp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-6 h-80">
                        <h3 className="text-lg font-medium text-white mb-6">Risk Probability Trend</h3>
                        <div className="h-[calc(100%-3rem)] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" hide />
                                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                    <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} fill="url(#colorRisk)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AI Health Report Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-indigo-500/30 shadow-2xl rounded-2xl p-6 relative overflow-hidden mb-8">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500"></div>

                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                                AI
                            </span>
                            Mistral AI Health Analysis
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                            <span className="relative flex h-2 w-2">
                                {isAnalyzing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isAnalyzing ? 'bg-indigo-500' : 'bg-slate-500'}`}></span>
                            </span>
                            {isAnalyzing ? 'Analyzing live data...' : 'Auto-updating every 60s'}
                        </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 font-mono text-sm text-slate-300 leading-relaxed relative min-h-[120px]">
                        {!healthReport && isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-4">
                                <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="animate-pulse">Consulting Mistral AI Health Models...</p>
                            </div>
                        ) : (
                            <div className="prose prose-invert max-w-none">
                                {healthReport.split('\n').map((line, i) => (
                                    <p key={i} className="mb-2">{line}</p>
                                ))}
                            </div>
                        )}

                        {healthReport && !isAnalyzing && (
                            <div className="mt-4 text-[10px] text-slate-600 border-t border-slate-800 pt-2 text-right uppercase tracking-widest">
                                Validated at {new Date().toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Forecast Section */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 shadow-xl rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0"></div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4 md:mb-0">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            60-Minute Predictive Forecast
                        </h3>
                        {forecast.length > 0 && (
                            <div className="text-right bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-800">
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Predicted Health Outlook</div>
                                <div className={`text-lg font-bold ${(forecast[forecast.length - 1]?.risk_score || 0) > 0.7 ? 'text-red-500' :
                                    (forecast[forecast.length - 1]?.gas_ppm || 0) > 300 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                    {(forecast[forecast.length - 1]?.risk_score || 0) > 0.7 ? 'HAZARDOUS CONDITIONS AHEAD' :
                                        (forecast[forecast.length - 1]?.gas_ppm || 0) > 300 ? 'QUALITY DEGRADING' : 'HEALTH IS GOOD'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-64">
                        {/* Gas Forecast */}
                        <div className="bg-slate-950/30 rounded-xl p-4 border border-slate-800/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Gas PPM Forecast</div>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecast}>
                                        <defs>
                                            <linearGradient id="colorForecastGas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} width={30} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                        <Area type="monotone" dataKey="gas_ppm" stroke="#a855f7" strokeWidth={2} fill="url(#colorForecastGas)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Temp Forecast */}
                        <div className="bg-slate-950/30 rounded-xl p-4 border border-slate-800/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Temperature Forecast</div>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecast}>
                                        <defs>
                                            <linearGradient id="colorForecastTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} width={30} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                        <Area type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} fill="url(#colorForecastTemp)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Humidity Forecast */}
                        <div className="bg-slate-950/30 rounded-xl p-4 border border-slate-800/50">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Humidity Forecast</div>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecast}>
                                        <defs>
                                            <linearGradient id="colorForecastHum" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="timestamp" hide />
                                        <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} width={30} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                                        <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} fill="url(#colorForecastHum)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
