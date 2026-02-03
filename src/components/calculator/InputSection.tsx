import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { LEVELS, type FlattenedUser } from '../../hooks/useCalculator';

interface InputSectionProps {
    targetMembers: FlattenedUser[];
    inputs: Record<string, { c: string, s: string, l: string }>;
    expandedMasters: Set<string>;
    onInputChange: (userId: string, field: 'c' | 's' | 'l', value: string) => void;
    onToggleMaster: (masterId: string) => void;
    children?: React.ReactNode; // For ActionButtons
}

export function InputSection({
    targetMembers,
    inputs,
    expandedMasters,
    onInputChange,
    onToggleMaster,
    children
}: InputSectionProps) {
    if (targetMembers.length === 0) return null;

    // 대마스터 찾기 (Find Grand Master)
    const grandMaster = targetMembers.find(u => u.level === LEVELS[0]);
    // 마스터들 찾기 (Find Masters - direct children of Grand Master)
    const masters = targetMembers.filter(u => u.level === LEVELS[1]);

    // 각 마스터별 하위 회원 가져오기
    const getSubordinates = (masterId: string) => {
        return targetMembers.filter(u => {
            if (u.level === LEVELS[0] || u.level === LEVELS[1]) return false;
            let current = u;
            while (current.parentId) {
                if (String(current.parentId) === masterId) return true;
                const parent = targetMembers.find(p => String(p.id) === String(current.parentId));
                if (!parent) break;
                if (parent.level === LEVELS[1]) return String(parent.id) === masterId;
                current = parent;
            }
            return false;
        });
    };

    // 마스터별 하위 회원 합계 계산
    const getMasterTotals = (masterId: string) => {
        const subs = getSubordinates(masterId);
        const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;
        let totalC = 0, totalS = 0, totalL = 0;

        const masterInp = inputs[masterId] || { c: '0', s: '0', l: '0' };
        totalC += parseAmount(masterInp.c);
        totalS += parseAmount(masterInp.s);
        totalL += parseAmount(masterInp.l);

        subs.forEach(s => {
            const inp = inputs[s.id!] || { c: '0', s: '0', l: '0' };
            totalC += parseAmount(inp.c);
            totalS += parseAmount(inp.s);
            totalL += parseAmount(inp.l);
        });

        const formatNumber = (num: number) => num > 0 ? num.toLocaleString() : '';
        return { c: formatNumber(totalC), s: formatNumber(totalS), l: formatNumber(totalL) };
    };

    // 대마스터 전체 합계
    const grandMasterTotals = (() => {
        let totalC = 0, totalS = 0, totalL = 0;
        const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;

        targetMembers.forEach(m => {
            const inp = inputs[m.id!] || { c: '0', s: '0', l: '0' };
            totalC += parseAmount(inp.c);
            totalS += parseAmount(inp.s);
            totalL += parseAmount(inp.l);
        });

        const formatNumber = (num: number) => num > 0 ? num.toLocaleString() : '';
        return { c: formatNumber(totalC), s: formatNumber(totalS), l: formatNumber(totalL) };
    })();

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Check className="text-slate-900" size={18} />
                    정산 내역 입력
                </h3>
                <div className="flex gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Fee(C)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span>Fee(S)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span>Losing</span>
                </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
                <div className="divide-y divide-slate-100">
                    {/* 대마스터 (Grand Master) */}
                    {grandMaster && (
                        <div className="p-4 bg-amber-50/50 border-b-2 border-amber-200">
                            <div className="flex items-center mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 truncate text-sm">
                                            {grandMaster.name}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-100">
                                            {grandMaster.level}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['c', 's', 'l'].map((field, idx) => (
                                    <div key={field} className="relative">
                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                            <span className={clsx("text-[10px] font-bold",
                                                idx === 0 ? "text-blue-400" : idx === 1 ? "text-purple-400" : "text-rose-400"
                                            )}>{field.toUpperCase() === 'L' ? 'L' : `Fee(${field.toUpperCase()})`}</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={grandMasterTotals[field as 'c' | 's' | 'l']}
                                            disabled
                                            className="w-full pl-12 pr-1 py-2 border rounded-lg font-bold outline-none text-sm text-right bg-amber-100/50 border-amber-200 text-amber-900 cursor-not-allowed"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 마스터 목록 */}
                    {masters.map(master => {
                        const strMasterId = String(master.id!);
                        const isExpanded = expandedMasters.has(strMasterId);
                        const subordinates = getSubordinates(strMasterId);
                        const masterTotals = getMasterTotals(strMasterId);
                        const masterInp = inputs[strMasterId] || { c: '', s: '', l: '' };

                        return (
                            <div key={master.id}>
                                <div
                                    className={clsx(
                                        "p-4 cursor-pointer transition-colors",
                                        isExpanded ? "bg-emerald-50/50" : "bg-white hover:bg-slate-50"
                                    )}
                                    onClick={() => onToggleMaster(strMasterId)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {isExpanded ? (
                                                <ChevronDown size={16} className="text-emerald-500 shrink-0" />
                                            ) : (
                                                <ChevronRight size={16} className="text-slate-400 shrink-0" />
                                            )}
                                            <span className="font-bold text-slate-800 truncate text-sm">
                                                {master.name}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border bg-slate-50 text-slate-500 border-slate-100">
                                                {master.level}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            하부 {subordinates.length}명
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 ml-6" onClick={e => e.stopPropagation()}>
                                        {['c', 's', 'l'].map((field, idx) => {
                                            const isLeaf = subordinates.length === 0;
                                            return (
                                                <div key={field} className="relative">
                                                    <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                        <span className={clsx("text-[10px] font-bold",
                                                            idx === 0 ? "text-blue-400" : idx === 1 ? "text-purple-400" : "text-rose-400"
                                                        )}>{field.toUpperCase() === 'L' ? 'L' : `Fee(${field.toUpperCase()})`}</span>
                                                    </div>
                                                    {!isExpanded ? (
                                                        <input
                                                            type="text"
                                                            value={masterTotals[field as 'c' | 's' | 'l']}
                                                            disabled
                                                            className="w-full pl-12 pr-1 py-2 border rounded-lg font-bold outline-none text-sm text-right bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0"
                                                            value={masterInp[field as 'c' | 's' | 'l'] || ''}
                                                            onChange={e => onInputChange(strMasterId, field as 'c' | 's' | 'l', e.target.value)}
                                                            disabled={!isLeaf}
                                                            className={clsx(
                                                                "w-full pl-12 pr-1 py-2 border rounded-lg font-bold outline-none text-sm transition-all text-right",
                                                                !isLeaf ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" :
                                                                    idx === 0 ? "bg-blue-50/20 border-blue-100 text-blue-900 focus:border-blue-500 focus:bg-white" :
                                                                        idx === 1 ? "bg-purple-50/20 border-purple-100 text-purple-900 focus:border-purple-500 focus:bg-white" :
                                                                            "bg-rose-50/20 border-rose-100 text-rose-900 focus:border-rose-500 focus:bg-white"
                                                            )}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isExpanded && subordinates.map(sub => {
                                    const subInp = inputs[sub.id!] || { c: '', s: '', l: '' };
                                    const subDepth = (sub as FlattenedUser).depth - 1;
                                    const isLeaf = !targetMembers.some(m => String(m.parentId) === String(sub.id));

                                    return (
                                        <div key={sub.id} className="p-4 bg-white hover:bg-slate-50 border-t border-slate-50">
                                            <div className="flex items-center mb-3">
                                                <div style={{ width: `${(subDepth + 1) * 16}px` }} className="shrink-0" />
                                                <div className="w-3 h-3 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mr-2 -mt-1 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 truncate text-sm">
                                                            {sub.name}
                                                        </span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border bg-slate-50 text-slate-500 border-slate-100">
                                                            {sub.level}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2" style={{ marginLeft: `${(subDepth + 1) * 16 + 20}px` }}>
                                                {['c', 's', 'l'].map((field, idx) => (
                                                    <div key={field} className="relative">
                                                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                            <span className={clsx("text-[10px] font-bold",
                                                                idx === 0 ? "text-blue-400" : idx === 1 ? "text-purple-400" : "text-rose-400"
                                                            )}>{field.toUpperCase() === 'L' ? 'L' : `Fee(${field.toUpperCase()})`}</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0"
                                                            value={subInp[field as 'c' | 's' | 'l'] || ''}
                                                            onChange={e => onInputChange(sub.id!, field as 'c' | 's' | 'l', e.target.value)}
                                                            disabled={!isLeaf}
                                                            className={clsx(
                                                                "w-full pl-12 pr-1 py-2 border rounded-lg font-bold outline-none text-sm transition-all text-right",
                                                                !isLeaf ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" :
                                                                    idx === 0 ? "bg-blue-50/20 border-blue-100 text-blue-900 focus:border-blue-500 focus:bg-white" :
                                                                        idx === 1 ? "bg-purple-50/20 border-purple-100 text-purple-900 focus:border-purple-500 focus:bg-white" :
                                                                            "bg-rose-50/20 border-rose-100 text-rose-900 focus:border-rose-500 focus:bg-white"
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
            {children}
        </div>
    );
}
