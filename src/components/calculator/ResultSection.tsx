import { DollarSign, Download } from 'lucide-react';
import { clsx } from 'clsx';
import type { CalculationResult } from '../../db';
import type { FlattenedUser } from '../../hooks/useCalculator';

interface ResultSectionProps {
    results: CalculationResult[] | null;
    targetMembers: FlattenedUser[];
    onDownloadPDF: () => void;
}

export function ResultSection({ results, targetMembers, onDownloadPDF }: ResultSectionProps) {
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
                casinoBreakdown: '',
                slotBreakdown: '',
                losingBreakdown: ''
            };
        }
        if (curr.source === 'casino') {
            acc[curr.userId].casino += curr.amount;
            if (curr.breakdown) acc[curr.userId].casinoBreakdown += (acc[curr.userId].casinoBreakdown ? '\n' : '') + curr.breakdown;
        }
        if (curr.source === 'slot') {
            acc[curr.userId].slot += curr.amount;
            if (curr.breakdown) acc[curr.userId].slotBreakdown += (acc[curr.userId].slotBreakdown ? '\n' : '') + curr.breakdown;
        }
        if (curr.source === 'losing') {
            acc[curr.userId].losing += curr.amount;
            if (curr.breakdown) acc[curr.userId].losingBreakdown += (acc[curr.userId].losingBreakdown ? '\n' : '') + curr.breakdown;
        }
        acc[curr.userId].total += curr.amount;
        return acc;
    }, {} as Record<string, { userId: string, userName: string, casino: number, slot: number, losing: number, total: number, casinoBreakdown: string, slotBreakdown: string, losingBreakdown: string }>);

    const totalCommission = results.reduce((acc, curr) => acc + curr.amount, 0) || 0;
    const siteProfit = 0; // Fixed as per original code

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
                            casinoBreakdown: '',
                            slotBreakdown: '',
                            losingBreakdown: ''
                        };
                        const depth = (u as FlattenedUser).depth;

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
                                        {u.loginId && <span className="text-xs text-slate-400 font-mono">{u.loginId}</span>}
                                    </div>

                                    {/* [3] Row: Breakdown Lines (C / S / L) */}
                                    <div className="grid grid-cols-3 divide-x divide-slate-100">
                                        {/* Casino */}
                                        <div className="p-2 flex flex-col gap-1">
                                            <div className="text-[10px] font-bold text-blue-400 uppercase text-center">Casino</div>
                                            <div className="text-center font-bold text-slate-700">{Math.floor(r.casino).toLocaleString()}</div>
                                            {r.casinoBreakdown && (
                                                <div className="text-center">
                                                    <details className="group inline-block text-left w-full">
                                                        <summary className="text-[10px] cursor-pointer text-slate-300 hover:text-blue-500 list-none text-center">▼</summary>
                                                        <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all absolute left-4 right-4 z-10 mx-auto max-w-sm">
                                                            {r.casinoBreakdown}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>

                                        {/* Slot */}
                                        <div className="p-2 flex flex-col gap-1">
                                            <div className="text-[10px] font-bold text-purple-400 uppercase text-center">Slot</div>
                                            <div className="text-center font-bold text-slate-700">{Math.floor(r.slot).toLocaleString()}</div>
                                            {r.slotBreakdown && (
                                                <div className="text-center">
                                                    <details className="group inline-block text-left w-full">
                                                        <summary className="text-[10px] cursor-pointer text-slate-300 hover:text-purple-500 list-none text-center">▼</summary>
                                                        <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all absolute left-4 right-4 z-10 mx-auto max-w-sm">
                                                            {r.slotBreakdown}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>

                                        {/* Losing */}
                                        <div className="p-2 flex flex-col gap-1">
                                            <div className="text-[10px] font-bold text-rose-400 uppercase text-center">Losing</div>
                                            <div className="text-center font-bold text-slate-700">{Math.floor(r.losing).toLocaleString()}</div>
                                            {r.losingBreakdown && (
                                                <div className="text-center">
                                                    <details className="group inline-block text-left w-full">
                                                        <summary className="text-[10px] cursor-pointer text-slate-300 hover:text-rose-500 list-none text-center">▼</summary>
                                                        <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all absolute left-4 right-4 z-10 mx-auto max-w-sm">
                                                            {r.losingBreakdown}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    </div>

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
