import { ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ZoneCardProps {
    zoneId: string;
    name: string;
    data: {
        gas_ppm: number;
        gas_detected: boolean;
        temperature: number;
        humidity: number;
    } | null;
    riskScore: number;
    anomaly: boolean;
}

export default function ZoneCard({ zoneId, name, data, riskScore, anomaly }: ZoneCardProps) {
    // Determine status color and text
    const isOffline = !data || (data.gas_ppm === 0 && data.temperature === 0);

    const getStatus = () => {
        if (isOffline) return { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'OFFLINE' };
        if (anomaly) return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'CRITICAL' };
        if (riskScore > 0.4) return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'WARNING' };
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'OPTIMAL' };
    };

    const status = getStatus();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className={`bg-slate-900/50 backdrop-blur-md border hover:bg-slate-800/50 transition-all duration-300 rounded-xl p-6 relative overflow-hidden backdrop-blur-xl ${status.border}`}
        >
            <div className={`absolute top-0 right-0 p-3 px-4 rounded-bl-xl text-xs font-bold tracking-wider ${status.bg} ${status.color}`}>
                {status.text}
            </div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{name}</h3>
                    <p className="text-slate-400 text-sm">Zone {zoneId}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Gas PPM</p>
                    <p className="text-xl font-mono text-white flex items-center gap-2">
                        {data?.gas_ppm.toFixed(0) || '--'}
                        <span className="text-[10px] text-slate-500">PPM</span>
                    </p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Temperature</p>
                    <p className="text-xl font-mono text-white flex items-center gap-2">
                        {data?.temperature.toFixed(1) || '--'}
                        <span className="text-[10px] text-slate-500">°C</span>
                    </p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Humidity</p>
                    <p className="text-xl font-mono text-white flex items-center gap-2">
                        {data?.humidity.toFixed(1) || '--'}
                        <span className="text-[10px] text-slate-500">%</span>
                    </p>
                </div>
                <div className={`p-3 rounded-lg ${isOffline ? 'bg-slate-500/10' : data?.gas_detected ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                    <p className="text-xs text-slate-400 mb-1">Gas Status</p>
                    <p className={`text-sm font-semibold flex items-center gap-2 ${isOffline ? 'text-slate-400' : data?.gas_detected ? 'text-red-400' : 'text-green-400'}`}>
                        {isOffline ? 'NO DATA' : data?.gas_detected ? 'DETECTED' : 'CLEAR'}
                    </p>
                </div>
            </div>

            <div className="relative pt-4 border-t border-white/5">
                <div className="flex justify-between items-end mb-2">
                    <p className="text-sm text-slate-400">Predicted Risk</p>
                    <p className={`text-2xl font-bold ${isOffline ? 'text-slate-500' : status.color}`}>
                        {isOffline ? '0%' : `${(riskScore * 100).toFixed(0)}%`}
                    </p>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: isOffline ? 0 : `${riskScore * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${isOffline ? 'bg-slate-700' : status.bg.replace('/10', '')}`}
                        style={{ backgroundColor: 'currentColor' }}
                    />
                </div>
            </div>

            <a href={`/zone/${zoneId}`} className="absolute inset-0 z-10" aria-label={`View details for Zone ${zoneId}`} />
        </motion.div>
    );
}
