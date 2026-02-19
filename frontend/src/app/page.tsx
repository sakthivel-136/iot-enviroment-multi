"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ZoneCard from '@/components/ZoneCard';
import EnvironmentMap from '@/components/EnvironmentMap';

interface ZoneData {
    zone_id: string;
    gas_ppm: number;
    gas_detected: boolean;
    temperature: number;
    humidity: number;
    risk_score: number;
    anomaly: boolean;
    created_at: string;
}

const ZONE_NAMES: { [key: string]: string } = {
    "A": "Kitchen",
    "B": "Living Room",
    "C": "Bedroom"
};

export default function Dashboard() {
    const [zones, setZones] = useState<{ [key: string]: ZoneData }>({});
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        const fetchLatestData = async () => {
            // 1. Fetch latest sensor readings
            const { data: readings } = await supabase
                .from('sensor_readings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            // 2. Fetch latest predictions
            const { data: predictions } = await supabase
                .from('predictions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (readings) {
                const zoneMap: { [key: string]: typeof zones[string] } = {}; // Use inferred type or any

                readings.forEach((row: any) => {
                    // Find corresponding prediction for this zone
                    const pred = predictions?.find((p: any) => p.zone_id === row.zone_id);

                    // Only update if we don't have a newer one for this zone
                    if (!zoneMap[row.zone_id]) {
                        zoneMap[row.zone_id] = {
                            ...row,
                            risk_score: pred?.risk_score || 0,
                            anomaly: pred?.anomaly || false
                        };
                    }
                });
                setZones(zoneMap);
            }

            // 3. Fetch latest alerts
            const { data: latestAlerts } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (latestAlerts) {
                setAlerts(latestAlerts);
            }
        };

        fetchLatestData();

        // Realtime subscription for Zones and Alerts
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchLatestData(); // Refresh on any new insert
                    if (payload.table === 'alerts') {
                        // In a real app, you might trigger a toast notification here
                        console.log("NEW ALERT RECEIVED:", payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="container mx-auto p-8 max-w-7xl">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-light text-white mb-2">
                        AIOT-<span className="font-bold text-sky-400">PRED</span>
                    </h1>
                    <p className="text-slate-400 font-mono text-sm tracking-wider">ENVIRONMENTAL MONITORING MULTI ZONES</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">System Status</p>
                        <p className="text-emerald-400 font-medium flex items-center justify-end gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Operational
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {['A', 'B', 'C'].map((id) => (
                    <ZoneCard
                        key={id}
                        zoneId={id}
                        name={ZONE_NAMES[id]}
                        data={zones[id] || null}
                        riskScore={zones[id]?.risk_score || 0}
                        anomaly={zones[id]?.anomaly || false}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl rounded-2xl p-8 relative overflow-hidden">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <span className="w-1 h-6 bg-sky-500 rounded-full" />
                        Environmental Map
                    </h2>
                    <EnvironmentMap className="rounded-xl border border-white/10" zones={zones} />
                </div>

                <div className="bg-slate-950/80 backdrop-blur-xl border border-indigo-500/30 shadow-2xl rounded-2xl overflow-hidden flex flex-col h-[500px]">
                    <div className="bg-slate-900/90 border-b border-white/5 p-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-blue-500 rounded-sm animate-pulse" />
                            System Event Log
                        </h2>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                        </div>
                    </div>

                    <div className="flex-1 bg-black/50 p-4 font-mono text-xs overflow-y-auto custom-scrollbar relative">
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>

                        {alerts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <div className="mb-2 text-4xl text-blue-500 opacity-30">_</div>
                                <p>SYSTEM_NOMINAL</p>
                                <p>NO_ACTIVE_THREATS_DETECTED</p>
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                {alerts.map((alert, idx) => (
                                    <div key={alert.id} className="border-l-2 border-red-500/50 pl-3 py-1 text-slate-300 animate-slide-in">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-0.5">
                                            <span className="text-cyan-500">[{new Date(alert.created_at).toLocaleTimeString()}]</span>
                                            <span>UID_{alert.id.slice(0, 4)}</span>
                                        </div>
                                        <div className="text-red-400 font-bold tracking-wide">
                                            &gt;&gt; WARNING: {alert.message}
                                        </div>
                                        <div className="text-slate-500 mt-1">
                                            LOC: ZONE_{alert.zone_id} | STATUS: ACTIVE
                                        </div>
                                    </div>
                                ))}
                                <div className="text-cyan-500 animate-pulse mt-4">_</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
