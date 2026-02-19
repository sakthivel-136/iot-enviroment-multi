"use client"

import { motion } from 'framer-motion';

interface ZoneData {
    zone_id: string;
    anomaly: boolean;
    risk_score: number;
}

interface EnvironmentMapProps {
    className?: string;
    zones?: { [key: string]: ZoneData };
}

export default function EnvironmentMap({ className, zones }: EnvironmentMapProps) {
    const getZoneColor = (id: string) => {
        const zone = zones?.[id];
        if (!zone) return 'from-slate-700/20 to-slate-800/20 border-white/5'; // Default / Loading

        if (zone.anomaly) return 'from-red-500/20 to-red-600/20 border-red-500/50';
        if (zone.risk_score > 0.4) return 'from-yellow-500/20 to-orange-600/20 border-yellow-500/50';
        return 'from-emerald-500/20 to-teal-600/20 border-emerald-500/50';
    };

    const zonesConfig = [
        { id: 'A', width: '40%', height: '50%', top: '0%', left: '0%', label: 'Kitchen' },
        { id: 'B', width: '60%', height: '50%', top: '0%', left: '40%', label: 'Living Room' },
        { id: 'C', width: '100%', height: '50%', top: '50%', left: '0%', label: 'Bedroom' }
    ];

    return (
        <div className={`aspect-video w-full relative bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-white/5 ${className}`}>
            {zonesConfig.map((zone) => (
                <motion.div
                    key={zone.id}
                    className={`absolute flex flex-col items-center justify-center border transition-all duration-500 bg-gradient-to-br ${getZoneColor(zone.id)}`}
                    style={{ width: zone.width, height: zone.height, top: zone.top, left: zone.left }}
                    whileHover={{ scale: 0.98 }}
                >
                    <span className="text-4xl font-black text-white/10 select-none">{zone.id}</span>
                    <span className="text-white font-medium text-sm mt-2">{zone.label}</span>
                </motion.div>
            ))}

            <div className="absolute bottom-4 right-4 flex gap-4 text-xs text-slate-400 bg-black/40 p-2 px-3 rounded-full backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Safe
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Warning
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Critical
                </div>
            </div>
        </div>
    );
}
