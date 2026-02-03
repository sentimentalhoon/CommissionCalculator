import { DollarSign, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import type { CalculationResult } from '../../db';
import type { FlattenedUser } from '../../hooks/useCalculator';

interface ResultSectionProps {
    results: CalculationResult[] | null;
    targetMembers: FlattenedUser[];
    onDownloadPDF: () => void;
}

// Subordinate Breakdown Data Type
interface SubBreakdown {
    fromUserName: string;
    casino: number;
    slot: number;
    losing: number;
    casinoBreakdown: string[];
    slotBreakdown: string[];
    losingBreakdown: string[];
}

interface UserResultData {
    userId: string;
    userName: string;
    casino: number;
    slot: number;
    losing: number;
    total: number;
    bySub: Record<string, SubBreakdown>; // Grouped by fromUserName
}

export function ResultSection({ results, targetMembers, onDownloadPDF }: ResultSectionProps) {
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    if (!results) return null;

    // Aggregate results logic
    const aggregated = results.reduce((acc, curr) => {
        if (!acc[curr.userId]) {
            acc[curr.userId] = {
                userId: curr.userId,
                userName: curr.userName,
                casino: 0,
                slot: 0,
                losing: 0,
                total: 0,
                bySub: {} // Init group map
            };
        }

        const userRec = acc[curr.userId];
        const fromName = curr.fromUserName || '기타';

        // Init sub breakdown if not exists
        if (!userRec.bySub[fromName]) {
            userRec.bySub[fromName] = {
                fromUserName: fromName,
                casino: 0,
                slot: 0,
                losing: 0,
                casinoBreakdown: [],
                slotBreakdown: [],
                losingBreakdown: []
            };
        }

        const subRec = userRec.bySub[fromName];

        if (curr.source === 'casino') {
            userRec.casino += curr.amount;
            subRec.casino += curr.amount;
            if (curr.breakdown) subRec.casinoBreakdown.push(curr.breakdown);
        }
        if (curr.source === 'slot') {
            userRec.slot += curr.amount;
            subRec.slot += curr.amount;
            if (curr.breakdown) subRec.slotBreakdown.push(curr.breakdown);
        }
        if (curr.source === 'losing') {
            userRec.losing += curr.amount;
            subRec.losing += curr.amount;
            if (curr.breakdown) subRec.losingBreakdown.push(curr.breakdown);
        }
        userRec.total += curr.amount;
        return acc;
    }, {} as Record<string, UserResultData>);

    const totalCommission = results.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const siteProfit = 0;

    const toggleExpand = (userId: string) => {
        const newSet = new Set(expandedUsers);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setExpandedUsers(newSet);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div id="results-summary" className="bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                {/* Summary Header */}
                <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-500" size={20} />
                        정산 결과
                        <button
                            onClick={onDownloadPDF}
                            className="ml-2 p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 active:scale-95 transition-all print:hidden"
                            title="PDF 다운로드"
                        >
                            <Download size={16} />
                        </button>
                    </h3>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-6 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase">총 지급 수수료</span>
                            <span className="text-xl font-black text-emerald-600">
                                {totalCommission.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase">본사 수익</span>
                            <span className={clsx(
                                "text-xl font-black",
                                siteProfit >= 0 ? "text-blue-600" : "text-rose-600"
                            )}>
                                {siteProfit.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Results List (1-3-1 Layout) */}
                <div className="p-4 space-y-3">
                    {targetMembers.map((u) => {
                        const r = aggregated[u.id!] || {
                            userId: u.id!,
                            userName: u.name,
                            casino: 0,
                            slot: 0,
                            losing: 0,
                            total: 0,
                            bySub: {}
                        };
                        const depth = (u as FlattenedUser).depth;
                        const isExpanded = expandedUsers.has(u.id!);
                        const hasDetails = Object.keys(r.bySub).length > 0;

                        return (
                            <div key={u.id} className="flex">
                                {/* Indentation Spacer */}
                                <div style={{ width: `${depth * 12}px` }} className="shrink-0 transition-all flex justify-end">
                                    {depth > 0 && <div className="w-3 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mb-4 ml-auto" />}
                                </div>

                                {/* User Card */}
                                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-sm">
                                    {/* [1] Row: User Info */}
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-base">
                                                {u.name}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white border-slate-200 text-slate-400 font-mono">
                                                {u.level}
                                            </span>
                                        </div>
                                        {/* Toggle Button for Details */}
                                        {hasDetails ? (
                                            <button
                                                onClick={() => toggleExpand(u.id!)}
                                                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-all text-xs font-bold px-2 py-1 rounded hover:bg-slate-100"
                                            >
                                                {isExpanded ? '접기' : '상세'}
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        ) : (
                                            u.loginId && <span className="text-xs text-slate-400 font-mono">{u.loginId}</span>
                                        )}
                                    </div>

                                    {/* [3] Row: Amount Summary (C / S / L) */}
                                    <div className="grid grid-cols-3 divide-x divide-slate-100">
                                        {/* Casino */}
                                        <div className="p-2 flex flex-col gap-1 items-center">
                                            <div className="text-[10px] font-bold text-blue-400 uppercase">Casino</div>
                                            <div className="font-bold text-slate-700">{Math.floor(r.casino).toLocaleString()}</div>
                                        </div>

                                        {/* Slot */}
                                        <div className="p-2 flex flex-col gap-1 items-center">
                                            <div className="text-[10px] font-bold text-purple-400 uppercase">Slot</div>
                                            <div className="font-bold text-slate-700">{Math.floor(r.slot).toLocaleString()}</div>
                                        </div>

                                        {/* Losing */}
                                        <div className="p-2 flex flex-col gap-1 items-center">
                                            <div className="text-[10px] font-bold text-rose-400 uppercase">Losing</div>
                                            <div className="font-bold text-slate-700">{Math.floor(r.losing).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Collapsible Details Section (Expanded) */}
                                    {isExpanded && (
                                        <div className="bg-slate-50 border-t border-slate-100 p-3 space-y-3">
                                            {Object.values(r.bySub).map((sub, idx) => (
                                                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">하부</span>
                                                        <span className="font-bold text-slate-800 text-sm">{sub.fromUserName}</span>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {/* Casino Detail */}
                                                        {sub.casinoBreakdown.length > 0 && (
                                                            <div className="text-xs">
                                                                <div className="flex justify-between font-bold text-blue-600 mb-1">
                                                                    <span>Casino 수익</span>
                                                                    <span>{sub.casino.toLocaleString()}</span>
                                                                </div>
                                                                <div className="pl-2 border-l-2 border-blue-100 text-slate-500 whitespace-pre-wrap leading-relaxed">
                                                                    {sub.casinoBreakdown.join('\n')}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Slot Detail */}
                                                        {sub.slotBreakdown.length > 0 && (
                                                            <div className="text-xs">
                                                                <div className="flex justify-between font-bold text-purple-600 mb-1">
                                                                    <span>Slot 수익</span>
                                                                    <span>{sub.slot.toLocaleString()}</span>
                                                                </div>
                                                                <div className="pl-2 border-l-2 border-purple-100 text-slate-500 whitespace-pre-wrap leading-relaxed">
                                                                    {sub.slotBreakdown.join('\n')}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Losing Detail */}
                                                        {sub.losingBreakdown.length > 0 && (
                                                            <div className="text-xs">
                                                                <div className="flex justify-between font-bold text-rose-600 mb-1">
                                                                    <span>Losing 수익</span>
                                                                    <span>{sub.losing.toLocaleString()}</span>
                                                                </div>
                                                                <div className="pl-2 border-l-2 border-rose-100 text-slate-500 whitespace-pre-wrap leading-relaxed">
                                                                    {sub.losingBreakdown.join('\n')}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* [1] Row: Total */}
                                    <div className="px-4 py-2 bg-slate-800 text-white flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-400">Total</span>
                                        <span className="font-black text-lg text-emerald-300">
                                            {Math.floor(r.total).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
