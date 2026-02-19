"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Overview' },
        { href: '/zone/A', label: 'Zone A (Kitchen)' },
        { href: '/zone/B', label: 'Zone B (Living)' },
        { href: '/zone/C', label: 'Zone C (Bedroom)' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-indigo-950/90 border-b border-indigo-800/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">AI</span>
                        </div>
                        <span className="text-white font-bold text-xl tracking-wider">AIOT-PRED</span>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {links.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {link.label}
                                        {isActive && (
                                            <motion.div
                                                layoutId="navbar-indicator"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
