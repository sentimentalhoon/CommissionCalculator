import { useState, useMemo, useEffect } from 'react';
import { db as firestoreDb } from '../firebase';
import { collection, onSnapshot, query, addDoc } from 'firebase/firestore';
import type { User, CalculationResult } from '../db';
import { calculateBatchCommission } from '../services/calculator';
import type { BatchInput } from '../services/calculator';
import { Calculator as CalcIcon, DollarSign, Check, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { LEVELS } from '../constants/levels';

// Helper to flatten tree for table display with depth
interface FlattenedUser extends User {
    depth: number;
}

const getDescendants = (users: User[], rootId: number, depth: number = 1): FlattenedUser[] => {
    const result: FlattenedUser[] = [];
    const children = users.filter(u => u.parentId === rootId); // Direct children
    children.forEach(child => {
        result.push({ ...child, depth });
        result.push(...getDescendants(users, child.id!, depth + 1));
    });
    return result;
};

export default function CalculatorPage() {
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Fetch users from Firestore
    useEffect(() => {
        const q = query(collection(firestoreDb, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: parseInt(doc.id), ...doc.data() } as User);
            });
            setAllUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const topLevelUsers = allUsers.filter(u => u.level === LEVELS[0]);

    const navigate = useNavigate();

    const [selectedMasterId, setSelectedMasterId] = useState<string>('');
    const [inputs, setInputs] = useState<Record<number, { c: string, s: string, l: string }>>({});
    const [results, setResults] = useState<CalculationResult[] | null>(null);

    // Get list of members to display (Selected Master + All Descendants)
    const targetMembers = useMemo(() => {
        if (!selectedMasterId) return [];
        const master = allUsers.find(u => u.id === parseInt(selectedMasterId));
        if (!master) return [];

        const descendants = getDescendants(allUsers, master.id!);
        return [{ ...master, depth: 0 } as FlattenedUser, ...descendants];
    }, [selectedMasterId, allUsers]);

    // Calculate Grand Master totals from all Masters (level 1)
    const grandMasterTotals = useMemo(() => {
        const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;

        // Find all Masters (level 1, direct children of Grand Master)
        const masters = targetMembers.filter(u => u.level === LEVELS[1]);

        let totalC = 0, totalS = 0, totalL = 0;
        masters.forEach(m => {
            const inp = inputs[m.id!] || { c: '0', s: '0', l: '0' };
            totalC += parseAmount(inp.c);
            totalS += parseAmount(inp.s);
            totalL += parseAmount(inp.l);
        });

        // Format with commas
        const formatNumber = (num: number) => num.toLocaleString();

        return {
            c: formatNumber(totalC),
            s: formatNumber(totalS),
            l: formatNumber(totalL)
        };
    }, [targetMembers, inputs]);

    const handleInputChange = (userId: number, field: 'c' | 's' | 'l', value: string) => {
        // Remove existing commas to clean
        const rawValue = value.replace(/,/g, '');

        // Allow empty string to clear input
        if (rawValue === '') {
            setInputs(prev => {
                const userState = prev[userId] || { c: '', s: '', l: '' };
                return {
                    ...prev,
                    [userId]: { ...userState, [field]: '' }
                };
            });
            return;
        }

        // Validate number (allow trailing dot for decimal typing)
        if (isNaN(Number(rawValue))) return;

        // Format integer part with commas
        const parts = rawValue.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        const displayValue = parts.join('.');

        setInputs(prev => {
            const userState = prev[userId] || { c: '', s: '', l: '' };
            return {
                ...prev,
                [userId]: {
                    ...userState,
                    [field]: displayValue
                }
            };
        });
    };

    const handleCalculate = async () => {
        if (!selectedMasterId) return;

        const batchData: BatchInput[] = targetMembers.map(u => {
            const inp = inputs[u.id!] || { c: '0', s: '0', l: '0' };
            // Parse formatted strings back to numbers
            const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;

            return {
                performerId: u.id!,
                amounts: {
                    casino: parseAmount(inp.c),
                    slot: parseAmount(inp.s),
                    losing: parseAmount(inp.l)
                }
            };
        }).filter(b => b.amounts.casino > 0 || b.amounts.slot > 0 || b.amounts.losing > 0);

        if (batchData.length === 0) {
            alert('입력된 금액이 없습니다. 최소 하나 이상의 금액을 입력해주세요.');
            return;
        }

        try {
            const res = await calculateBatchCommission(batchData, allUsers);
            setResults(res);
        } catch (e) {
            console.error(e);
            alert('계산 중 오류가 발생했습니다.');
        }
    };

    const handleSave = async () => {
        if (!results) return;

        // Calculate total inputs for the log (sum of all inputs)
        const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;

        let totalC = 0, totalS = 0, totalL = 0;
        targetMembers.forEach(u => {
            const inp = inputs[u.id!] || { c: '0', s: '0', l: '0' };
            totalC += parseAmount(inp.c);
            totalS += parseAmount(inp.s);
            totalL += parseAmount(inp.l);
        });

        // Save to Firestore
        await addDoc(collection(firestoreDb, "logs"), {
            date: new Date(),
            casinoRolling: totalC,
            slotRolling: totalS,
            losingAmount: totalL,
            results: results
        });

        alert('저장되었습니다!');
        setResults(null);
        setInputs({});
        navigate('/');
    };

    const totalCommission = results?.reduce((sum, item) => sum + item.amount, 0) || 0;

    // Calculate Site Profit: Grand Master's Losing - Total Commission
    const siteProfit = useMemo(() => {
        if (!selectedMasterId) return 0;
        // Use grandMasterTotals which is the sum of all Masters
        const grandMasterLosing = parseFloat(grandMasterTotals.l.replace(/,/g, '')) || 0;

        return grandMasterLosing - totalCommission;
    }, [selectedMasterId, grandMasterTotals, totalCommission]);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('results-summary');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Commission_Results_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('PDF 생성에 실패했습니다.');
        }
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center space-x-3 text-primary-700">
                <div className="p-2 bg-primary-100 rounded-lg">
                    <CalcIcon size={24} />
                </div>
                <h2 className="text-lg font-bold">팀 정산</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <label className="block text-sm font-bold text-slate-700 mb-2">최상위 관리자 선택</label>
                    <select
                        value={selectedMasterId}
                        onChange={e => {
                            setSelectedMasterId(e.target.value);
                            setInputs({});
                            setResults(null);
                        }}
                        className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 outline-none bg-white font-bold text-lg"
                    >
                        <option value="">팀 선택...</option>
                        {topLevelUsers.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>

                {targetMembers.length > 0 && (
                    <div className="divide-y divide-slate-100">
                        {targetMembers.map(u => {
                            const isGrandMaster = u.level === LEVELS[0];
                            const inp = isGrandMaster ? grandMasterTotals : (inputs[u.id!] || { c: '', s: '', l: '' });
                            const depth = (u as FlattenedUser).depth;

                            return (
                                <div key={u.id} className={clsx(
                                    "p-4 transition-colors",
                                    isGrandMaster ? "bg-amber-50/50 border-b-2 border-amber-200" : "bg-white hover:bg-slate-50"
                                )}>
                                    {/* Header: Name & Hierarchy Info */}
                                    <div className="flex items-center mb-3">
                                        {/* Visual Depth Indicator */}
                                        <div style={{ width: `${depth * 12}px` }} className="shrink-0 transition-all" />
                                        {depth > 0 && (
                                            <div className="w-3 h-3 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mr-2 -mt-1 shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 truncate text-sm">
                                                    {u.name}
                                                </span>
                                                <span className={clsx(
                                                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border",
                                                    u.level === LEVELS[0] ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                        u.level === LEVELS[1] ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            "bg-slate-50 text-slate-500 border-slate-100"
                                                )}>{u.level}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inputs Grid */}
                                    <div className="grid grid-cols-3 gap-2 ml-1">
                                        {/* Casino */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-blue-400">C</span>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={inp.c || ''}
                                                onChange={e => handleInputChange(u.id!, 'c', e.target.value)}
                                                disabled={isGrandMaster}
                                                className={clsx(
                                                    "w-full pl-6 pr-1 py-2 border rounded-lg font-bold outline-none text-sm transition-all text-right",
                                                    isGrandMaster
                                                        ? "bg-amber-100/50 border-amber-200 text-amber-900 cursor-not-allowed"
                                                        : "bg-blue-50/20 border-blue-100 text-blue-900 focus:border-blue-500 focus:bg-white placeholder:text-blue-200/50"
                                                )}
                                            />
                                        </div>

                                        {/* Slot */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-purple-400">S</span>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={inp.s || ''}
                                                onChange={e => handleInputChange(u.id!, 's', e.target.value)}
                                                disabled={isGrandMaster}
                                                className={clsx(
                                                    "w-full pl-6 pr-1 py-2 border rounded-lg font-bold outline-none text-sm transition-all text-right",
                                                    isGrandMaster
                                                        ? "bg-amber-100/50 border-amber-200 text-amber-900 cursor-not-allowed"
                                                        : "bg-purple-50/20 border-purple-100 text-purple-900 focus:border-purple-500 focus:bg-white placeholder:text-purple-200/50"
                                                )}
                                            />
                                        </div>

                                        {/* Losing */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-rose-400">L</span>
                                            </div>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                value={inp.l || ''}
                                                onChange={e => handleInputChange(u.id!, 'l', e.target.value)}
                                                disabled={isGrandMaster}
                                                className={clsx(
                                                    "w-full pl-6 pr-1 py-2 border rounded-lg font-bold outline-none text-sm transition-all text-right",
                                                    isGrandMaster
                                                        ? "bg-amber-100/50 border-amber-200 text-amber-900 cursor-not-allowed"
                                                        : "bg-rose-50/20 border-rose-100 text-rose-900 focus:border-rose-500 focus:bg-white placeholder:text-rose-200/50"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {targetMembers.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={handleCalculate}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
                        >
                            정산 결과 계산하기
                        </button>
                    </div>
                )}
            </div>

            {results && (() => {
                // Aggregate results by user
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
                }, {} as Record<number, { userId: number, userName: string, casino: number, slot: number, losing: number, total: number, casinoBreakdown: string, slotBreakdown: string, losingBreakdown: string }>);

                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div id="results-summary" className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <DollarSign className="text-emerald-500" size={20} />
                                    정산 결과
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="ml-2 p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 active:scale-95 transition-all print:hidden"
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

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">회원</th>
                                            <th className="px-4 py-3 font-bold text-right text-blue-700">카지노</th>
                                            <th className="px-4 py-3 font-bold text-right text-purple-700">슬롯</th>
                                            <th className="px-4 py-3 font-bold text-right text-rose-700">루징</th>
                                            <th className="px-4 py-3 font-bold text-right">합계</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
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
                                            const hasBreakdown = r.casinoBreakdown || r.slotBreakdown || r.losingBreakdown;

                                            return (
                                                <>
                                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-900 border-l-4 border-transparent hover:border-primary-500">
                                                            <div className="flex items-center">
                                                                <div style={{ width: `${depth * 12}px` }} className="shrink-0 transition-all" />
                                                                {depth > 0 && (
                                                                    <div className="w-3 h-3 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mr-2 -mt-1 shrink-0" />
                                                                )}
                                                                <span className={clsx("truncate", depth === 0 ? "text-base" : "text-sm")}>
                                                                    {u.name}
                                                                    {u.loginId && <span className="text-xs font-normal text-slate-400 ml-1">({u.loginId})</span>}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                                                            {Math.floor(r.casino).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                                                            {Math.floor(r.slot).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                                                            {Math.floor(r.losing).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-black text-slate-800 bg-slate-50/50">
                                                            {Math.floor(r.total).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                    {/* Breakdown Row */}
                                                    {hasBreakdown && (
                                                        <tr className="bg-slate-50/30">
                                                            <td colSpan={5} className="px-4 py-2">
                                                                <details className="text-xs">
                                                                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                                                                        📋 계산 상세 보기
                                                                    </summary>
                                                                    <div className="mt-2 space-y-1 text-slate-600 font-mono text-[10px] leading-relaxed whitespace-pre-wrap bg-white p-2 rounded border border-slate-200">
                                                                        {r.casinoBreakdown && <div className="text-blue-700">{r.casinoBreakdown}</div>}
                                                                        {r.slotBreakdown && <div className="text-purple-700">{r.slotBreakdown}</div>}
                                                                        {r.losingBreakdown && <div className="text-rose-700">{r.losingBreakdown}</div>}
                                                                    </div>
                                                                </details>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                        {targetMembers.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                                                    회원이 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            기록 저장하기
                        </button>
                    </div>
                );
            })()}
        </div >
    );
}
