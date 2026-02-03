
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService'; // Import userService
import type { User, CalculationResult } from '../db';
import { calculateBatchCommission, type BatchInput } from '../services/calculator';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useSearchParams } from 'react-router-dom';

// ===== 유틸리티 (Utilities) =====
import { clsx } from 'clsx';
import { format } from 'date-fns';

// ===== 아이콘 (Icons) =====
import { Calculator as CalcIcon, DollarSign, Check, Download, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

// ===== PDF 생성 라이브러리 (PDF generation libraries) =====
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ===== 레벨 상수 (Level Constants) =====
const LEVELS = ['대마스터', '마스터', '부본사', '총판', '매장', '회원']; // Hierarchy Levels

interface FlattenedUser extends User {
    depth: number;
}

export default function CalculatorPage() {
    const { currentUser } = useAuth()!;
    const [searchParams] = useSearchParams();

    // ===== 상태 관리 (State Management) =====
    // ID types changed to string
    const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    // inputs state: Key=userId (string), Value={c, s, l}
    const [inputs, setInputs] = useState<Record<string, { c: string, s: string, l: string }>>({});

    const [results, setResults] = useState<CalculationResult[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // 접기/펼치기 상태 관리 (Expanded Masters State) - ID type string
    const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());

    // ===== 데이터 로어 (Data Loading) =====
    useEffect(() => {
        const loadUsers = async () => {
            if (currentUser) {
                // Use userService instead of Dexie
                const allUsers = await userService.getAllUsers();
                console.log("📥 Loaded users:", allUsers.length);
                setUsers(allUsers);
            }
        };
        loadUsers();
    }, [currentUser]);

    // ===== LocalStorage 저장/로드 (LocalStorage Persistence) =====
    // 1. Load from LocalStorage on mount (if no URL param)
    useEffect(() => {
        const logId = searchParams.get('logId');
        if (!logId) {
            const savedMasterId = localStorage.getItem('calc_selectedMasterId');
            const savedInputs = localStorage.getItem('calc_inputs');

            if (savedMasterId) setSelectedMasterId(savedMasterId);
            if (savedInputs) {
                try {
                    setInputs(JSON.parse(savedInputs));
                } catch (e) {
                    console.error("Failed to parse saved inputs", e);
                }
            }
        }
    }, [searchParams]);

    // 2. Save to LocalStorage on change
    useEffect(() => {
        if (selectedMasterId) {
            localStorage.setItem('calc_selectedMasterId', selectedMasterId);
        } else {
            localStorage.removeItem('calc_selectedMasterId');
        }
    }, [selectedMasterId]);

    useEffect(() => {
        if (Object.keys(inputs).length > 0) {
            localStorage.setItem('calc_inputs', JSON.stringify(inputs));
        } else {
            localStorage.removeItem('calc_inputs');
        }
    }, [inputs]);

    // ===== URL 파라미터 로드 기능 (Load from Log ID) =====
    useEffect(() => {
        const loadLogData = async () => {
            const logId = searchParams.get('logId');
            if (logId) {
                try {
                    const docRef = doc(firestoreDb, 'calculation_logs', logId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // 복원 로직
                        if (data.selectedMasterId) setSelectedMasterId(data.selectedMasterId.toString());
                        if (data.inputs) setInputs(data.inputs);
                    } else {
                        console.error("No such log document!");
                    }
                } catch (error) {
                    console.error("Error loading log:", error);
                }
            }
        };
        loadLogData();
    }, [searchParams]);

    // ===== 데이터 가공 (Data Processing) =====
    // "대마스터" 목록 (Top-level masters)
    const grandMasters = useMemo(() => {
        return users.filter(u => u.level === LEVELS[0]);
    }, [users]);

    // 선택된 대마스터 하위의 모든 회원 (All descendants of selected Grand Master)
    const targetMembers = useMemo(() => {
        console.log("🔄 Calculation starting. selectedMasterId:", selectedMasterId, typeof selectedMasterId);
        if (!selectedMasterId) return [];

        const result: FlattenedUser[] = [];
        // ID 비교 시 문자열 변환 (Convert to string for ID comparison)
        const master = users.find(u => String(u.id) === String(selectedMasterId));

        console.log("👤 Master found:", master?.name, master?.id);

        if (master) {
            // 자식 노드 맵 생성 (ParentId -> Children List)
            const childrenMap = new Map<string, User[]>();
            users.forEach(u => {
                if (u.parentId) {
                    // parentId가 숫자일 수도 있으므로 문자열로 변환 (parentId might be number, convert to string)
                    const pid = String(u.parentId).trim();
                    if (!childrenMap.has(pid)) {
                        childrenMap.set(pid, []);
                    }
                    childrenMap.get(pid)!.push(u);
                }
            });

            console.log(`🗺️ Children Map constructed with ${childrenMap.size} parents.`);

            // 재귀적으로 하위 회원 찾기 (Recursive find)
            const findChildren = (parentId: string, depth: number) => {
                const pid = String(parentId).trim();
                const children = childrenMap.get(pid) || [];

                console.log(`🔎 Finding children for ${pid} (Depth ${depth}): Found ${children.length}`);

                // 이름순 정렬
                children.sort((a, b) => a.name.localeCompare(b.name));

                children.forEach(child => {
                    result.push({ ...child, depth });
                    if (child.id) findChildren(String(child.id), depth + 1);
                });
            };

            result.push({ ...master, depth: 0 });
            if (master.id) findChildren(String(master.id), 1);
        }

        console.log("✅ Final targetMembers count:", result.length);
        return result;
    }, [selectedMasterId, users]);

    // ===== 핸들러 (Handlers) =====
    const handleMasterSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value; // Already string
        setSelectedMasterId(id);
        setInputs({}); // 마스터 변경 시 입력값 초기화
        setResults(null);
        setExpandedMasters(new Set()); // 마스터 변경 시 펼침 상태 초기화
    };

    const handleInputChange = (userId: string, field: 'c' | 's' | 'l', value: string) => {
        // 숫자와 콤마만 허용
        const cleanValue = value.replace(/[^0-9,]/g, '');
        // 콤마 포맷팅
        const formattedValue = Number(cleanValue.replace(/,/g, '')).toLocaleString();

        setInputs(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: cleanValue ? formattedValue : ''
            }
        }));
    };

    const toggleMaster = (masterId: string) => {
        setExpandedMasters(prev => {
            const next = new Set(prev);
            if (next.has(masterId)) {
                next.delete(masterId);
            } else {
                next.add(masterId);
            }
            return next;
        });
    };

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            // ⭐ 계산 직전에 최신 유저 정보 다시 가져오기 (Refresh users data before calculation)
            // Using userService instead of Dexie
            const freshUsers = await userService.getAllUsers();
            setUsers(freshUsers);

            const batchInputs: BatchInput[] = [];

            // 입력값이 있는 회원들만 처리
            Object.entries(inputs).forEach(([userId, val]) => {
                const c = parseFloat(val.c.replace(/,/g, '') || '0');
                const s = parseFloat(val.s.replace(/,/g, '') || '0');
                const l = parseFloat(val.l.replace(/,/g, '') || '0');

                if (c > 0 || s > 0 || l > 0) {
                    batchInputs.push({
                        performerId: userId, // string
                        amounts: { casino: c, slot: s, losing: l }
                    });
                }
            });

            // 계산 실행 (Execute Calculation with FRESH users)
            const calcResults = await calculateBatchCommission(batchInputs, freshUsers);
            setResults(calcResults);

            // 자동 저장
            await handleSave(calcResults);

        } catch (error) {
            console.error(error);
            alert('계산 중 오류가 발생했습니다.');
        } finally {
            setIsCalculating(false);
        }
    };

    // Firestore에 저장 (Save to Firestore)
    const handleSave = async (calcResults: CalculationResult[]) => {
        try {
            // 날짜 기반 로그 생성
            const today = new Date(); // 로컬 시간대 사용 (Use local time)

            // 총 롤링 및 정산금 계산
            let totalCasino = 0;
            let totalSlot = 0;
            let totalLosing = 0;

            // 입력값 기준 합계 (Total from Inputs)
            Object.values(inputs).forEach(inp => {
                totalCasino += parseFloat(inp.c.replace(/,/g, '') || '0');
                totalSlot += parseFloat(inp.s.replace(/,/g, '') || '0');
                totalLosing += parseFloat(inp.l.replace(/,/g, '') || '0');
            });

            // 저장할 데이터 구조
            const logData = {
                date: today,
                casinoRolling: totalCasino,
                slotRolling: totalSlot,
                losingAmount: totalLosing,
                results: calcResults,
                // 저장 시 복원 위한 데이터 추가
                selectedMasterId: selectedMasterId,
                inputs: inputs
            };

            // 컬렉션에 추가
            const docRef = doc(firestoreDb, 'calculation_logs', today.getTime().toString());
            await setDoc(docRef, logData);

        } catch (e) {
            console.error("Error saving log:", e);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('results-summary');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`fee_settlement_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
        } catch (error) {
            console.error('PDF generation failed', error);
            alert('PDF 생성에 실패했습니다.');
        }
    };

    // 총 지급 수수료 합계 (Total Commission)
    const totalCommission = results?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const siteProfit = 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/20">
                    <CalcIcon className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                        수수료 정산
                    </h1>
                    <p className="text-slate-500 font-medium">
                        하부 회원의 수수료를 입력하여 상위 수익을 정산합니다.
                    </p>
                </div>
            </div>

            {/* 마스터 선택 (Select Master) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    정산할 대마스터 선택
                </label>
                <div className="relative">
                    <select
                        value={selectedMasterId || ''}
                        onChange={handleMasterSelect}
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                    >
                        <option value="">선택해주세요</option>
                        {grandMasters.map(gm => (
                            <option key={gm.id} value={gm.id}>
                                {gm.name} ({gm.level})
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
            </div>

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
                    {targetMembers.length > 0 && (() => {
                        // 대마스터 찾기 (Find Grand Master)
                        const grandMaster = targetMembers.find(u => u.level === LEVELS[0]);
                        // 마스터들 찾기 (Find Masters - direct children of Grand Master)
                        const masters = targetMembers.filter(u => u.level === LEVELS[1]);

                        // 각 마스터별 하위 회원 가져오기 (Get subordinates for each master)
                        const getSubordinates = (masterId: string) => {
                            return targetMembers.filter(u => {
                                if (u.level === LEVELS[0] || u.level === LEVELS[1]) return false;
                                // 상위 체인을 따라 올라가면서 해당 마스터에 속하는지 확인
                                let current = u;
                                while (current.parentId) {
                                    // 문자열로 변환하여 비교 (Convert to string for comparison)
                                    if (String(current.parentId) === masterId) return true;

                                    // 부모 찾기시에도 문자열 ID 비교 (Find parent using string ID)
                                    const parent = targetMembers.find(p => String(p.id) === String(current.parentId));
                                    if (!parent) break;
                                    if (parent.level === LEVELS[1]) return String(parent.id) === masterId;
                                    current = parent;
                                }
                                return false;
                            });
                        };

                        // 마스터별 하위 회원 합계 계산 (Calculate totals per master)
                        const getMasterTotals = (masterId: string) => {
                            const subs = getSubordinates(masterId);
                            const parseAmount = (val: string) => parseFloat((val || '0').replace(/,/g, '')) || 0;
                            let totalC = 0, totalS = 0, totalL = 0;

                            // 마스터 자신의 입력값 포함
                            const masterInp = inputs[masterId] || { c: '0', s: '0', l: '0' };
                            totalC += parseAmount(masterInp.c);
                            totalS += parseAmount(masterInp.s);
                            totalL += parseAmount(masterInp.l);

                            // 하위 회원들의 입력값 합산
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
                            <div className="divide-y divide-slate-100">
                                {/* 대마스터 (Grand Master) - 항상 표시 */}
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
                                        {/* Grand Master totals (read-only) */}
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

                                {/* 마스터 목록 (Masters List) - 접기/펼치기 가능 */}
                                {masters.map(master => {
                                    const strMasterId = String(master.id!);
                                    const isExpanded = expandedMasters.has(strMasterId);
                                    const subordinates = getSubordinates(strMasterId);
                                    const masterTotals = getMasterTotals(strMasterId);
                                    const masterInp = inputs[strMasterId] || { c: '', s: '', l: '' };

                                    return (
                                        <div key={master.id}>
                                            {/* 마스터 헤더 (Master Header) - 클릭하면 펼침/접힘 */}
                                            <div
                                                className={clsx(
                                                    "p-4 cursor-pointer transition-colors",
                                                    isExpanded ? "bg-emerald-50/50" : "bg-white hover:bg-slate-50"
                                                )}
                                                onClick={() => toggleMaster(strMasterId)}
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

                                                {/* 마스터 합계 표시 (접힌 상태) 또는 입력 필드 (해당 마스터가 최하위라면 입력 가능) */}
                                                <div className="grid grid-cols-3 gap-2 ml-6" onClick={e => e.stopPropagation()}>
                                                    {['c', 's', 'l'].map((field, idx) => {
                                                        // 마스터가 최하위인지 확인 (하위 회원이 없으면 최하위)
                                                        const isLeaf = subordinates.length === 0;

                                                        return (
                                                            <div key={field} className="relative">
                                                                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                                                    <span className={clsx("text-[10px] font-bold",
                                                                        idx === 0 ? "text-blue-400" : idx === 1 ? "text-purple-400" : "text-rose-400"
                                                                    )}>{field.toUpperCase() === 'L' ? 'L' : `Fee(${field.toUpperCase()})`}</span>
                                                                </div>
                                                                {!isExpanded ? (
                                                                    // 접힌 상태: 합계 표시
                                                                    <input
                                                                        type="text"
                                                                        value={masterTotals[field as 'c' | 's' | 'l']}
                                                                        disabled
                                                                        className="w-full pl-12 pr-1 py-2 border rounded-lg font-bold outline-none text-sm text-right bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed"
                                                                    />
                                                                ) : (
                                                                    // 펼친 상태: 최하위만 입력 가능
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        placeholder="0"
                                                                        value={masterInp[field as 'c' | 's' | 'l'] || ''}
                                                                        onChange={e => handleInputChange(strMasterId, field as 'c' | 's' | 'l', e.target.value)}
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

                                            {/* 하위 회원들 (Subordinates) - 펼침 상태에서만 표시 */}
                                            {isExpanded && subordinates.map(sub => {
                                                const subInp = inputs[sub.id!] || { c: '', s: '', l: '' };
                                                const subDepth = (sub as FlattenedUser).depth - 1; // 마스터 기준 상대 깊이

                                                // 최하위 판별 (현재 리스트 내에서 이 회원을 부모로 두는 회원이 없으면 최하위)
                                                // 주의: targetMembers는 선택된 마스터의 하위 조직도 전체임.
                                                // 비교 시 문자열 변환 필수
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
                                                                        onChange={e => handleInputChange(sub.id!, field as 'c' | 's' | 'l', e.target.value)}
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
                        );

                    })()}
                </div>

                {targetMembers.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                        <button
                            onClick={() => {
                                if (window.confirm('모든 입력값이 0으로 초기화됩니다. 계속하시겠습니까?')) {
                                    setInputs({});
                                    setResults(null);
                                    alert('초기화되었습니다.');
                                }
                            }}
                            className="flex-1 bg-white text-slate-600 font-bold py-4 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={20} />
                            초기화
                        </button>
                        <button
                            onClick={handleCalculate}
                            disabled={isCalculating}
                            className={clsx(
                                "flex-[2] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]",
                                isCalculating ? "bg-slate-700 cursor-wait opacity-80" : "bg-slate-900 shadow-slate-900/20"
                            )}
                        >
                            {isCalculating ? '계산 중...' : '정산 결과 계산하기'}
                        </button>
                    </div>
                )}
            </div>

            {results && (() => {
                // Aggregate results by user - Key is string
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


                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div id="results-summary" className="bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                            {/* Summary Header */}
                            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <DollarSign className="text-emerald-500" size={20} />
                                    정산 결과
                                    <button
                                        onClick={handleDownloadPDF}
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

                                                        {/* Re-implement details for cleaner flow */}
                                                        {r.casinoBreakdown && (
                                                            <div className="text-center">
                                                                <details className="group inline-block text-left w-full">
                                                                    <summary className="text-[10px] cursor-pointer text-slate-300 hover:text-blue-500 list-none text-center">▼</summary>
                                                                    <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all">
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
                                                                    <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all">
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
                                                                    <div className="text-[10px] text-left text-slate-500 bg-slate-50 p-2 rounded mt-1 whitespace-pre-wrap leading-relaxed border border-slate-100 break-all">
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
            })()}
        </div>
    );
}
