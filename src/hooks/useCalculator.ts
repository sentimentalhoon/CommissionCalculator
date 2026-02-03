import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import type { User, CalculationResult } from '../db';
import { calculateBatchCommission, type BatchInput } from '../services/calculator';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { useSearchParams } from 'react-router-dom';

// ===== 레벨 상수 (Level Constants) =====
export const LEVELS = ['대마스터', '마스터', '부본사', '총판', '매장', '회원'];

export interface FlattenedUser extends User {
    depth: number;
}

export function useCalculator() {
    const { currentUser } = useAuth()!;
    const [searchParams] = useSearchParams();

    // ===== 상태 관리 (State Management) =====
    const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [inputs, setInputs] = useState<Record<string, { c: string, s: string, l: string }>>({});
    const [results, setResults] = useState<CalculationResult[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());

    // ===== 데이터 로드 (Data Loading) =====
    useEffect(() => {
        const loadUsers = async () => {
            if (currentUser) {
                const allUsers = await userService.getAllUsers();
                setUsers(allUsers);
            }
        };
        loadUsers();
    }, [currentUser]);

    // ===== LocalStorage 저장/로드 =====
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
                        if (data.selectedMasterId) setSelectedMasterId(data.selectedMasterId.toString());
                        if (data.inputs) setInputs(data.inputs);
                    }
                } catch (error) {
                    console.error("Error loading log:", error);
                }
            }
        };
        loadLogData();
    }, [searchParams]);

    // ===== 데이터 가공 (Data Processing) =====
    const grandMasters = useMemo(() => {
        return users.filter(u => u.level === LEVELS[0]);
    }, [users]);

    const targetMembers = useMemo(() => {
        if (!selectedMasterId) return [];

        const result: FlattenedUser[] = [];
        // ID 비교 시 문자열 변환
        const master = users.find(u => String(u.id) === String(selectedMasterId));

        if (master) {
            const childrenMap = new Map<string, User[]>();
            users.forEach(u => {
                if (u.parentId) {
                    const pid = String(u.parentId).trim();
                    if (!childrenMap.has(pid)) {
                        childrenMap.set(pid, []);
                    }
                    childrenMap.get(pid)!.push(u);
                }
            });

            const findChildren = (parentId: string, depth: number) => {
                const pid = String(parentId).trim();
                const children = childrenMap.get(pid) || [];
                children.sort((a, b) => a.name.localeCompare(b.name));

                children.forEach(child => {
                    result.push({ ...child, depth });
                    if (child.id) findChildren(String(child.id), depth + 1);
                });
            };

            result.push({ ...master, depth: 0 });
            if (master.id) findChildren(String(master.id), 1);
        }
        return result;
    }, [selectedMasterId, users]);

    // ===== 핸들러 (Handlers) =====
    const handleMasterSelect = useCallback((id: string) => {
        setSelectedMasterId(id);
        setInputs({});
        setResults(null);
        setExpandedMasters(new Set());
    }, []);

    const handleInputChange = useCallback((userId: string, field: 'c' | 's' | 'l', value: string) => {
        const cleanValue = value.replace(/[^0-9,]/g, '');
        const formattedValue = cleanValue ? Number(cleanValue.replace(/,/g, '')).toLocaleString() : '';

        setInputs(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: formattedValue
            }
        }));
    }, []);

    const toggleMaster = useCallback((masterId: string) => {
        setExpandedMasters(prev => {
            const next = new Set(prev);
            if (next.has(masterId)) {
                next.delete(masterId);
            } else {
                next.add(masterId);
            }
            return next;
        });
    }, []);

    const handleSave = async (calcResults: CalculationResult[]) => {
        try {
            const today = new Date();
            let totalCasino = 0;
            let totalSlot = 0;
            let totalLosing = 0;

            Object.values(inputs).forEach(inp => {
                totalCasino += parseFloat(inp.c.replace(/,/g, '') || '0');
                totalSlot += parseFloat(inp.s.replace(/,/g, '') || '0');
                totalLosing += parseFloat(inp.l.replace(/,/g, '') || '0');
            });

            const logData = {
                date: today,
                casinoRolling: totalCasino,
                slotRolling: totalSlot,
                losingAmount: totalLosing,
                results: calcResults,
                selectedMasterId: selectedMasterId,
                inputs: inputs
            };

            const docRef = doc(firestoreDb, 'calculation_logs', today.getTime().toString());
            await setDoc(docRef, logData);
        } catch (e) {
            console.error("Error saving log:", e);
        }
    };

    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const freshUsers = await userService.getAllUsers();
            setUsers(freshUsers);

            const batchInputs: BatchInput[] = [];
            Object.entries(inputs).forEach(([userId, val]) => {
                const c = parseFloat(val.c.replace(/,/g, '') || '0');
                const s = parseFloat(val.s.replace(/,/g, '') || '0');
                const l = parseFloat(val.l.replace(/,/g, '') || '0');

                if (c > 0 || s > 0 || l > 0) {
                    batchInputs.push({
                        performerId: userId,
                        amounts: { casino: c, slot: s, losing: l }
                    });
                }
            });

            const calcResults = await calculateBatchCommission(batchInputs, freshUsers);
            setResults(calcResults);
            await handleSave(calcResults);

        } catch (error) {
            console.error(error);
            alert('계산 중 오류가 발생했습니다.');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleReset = useCallback(() => {
        if (window.confirm('모든 입력값이 0으로 초기화됩니다. 계속하시겠습니까?')) {
            setInputs({});
            setResults(null);
            alert('초기화되었습니다.');
        }
    }, []);

    return {
        users,
        selectedMasterId,
        inputs,
        results,
        isCalculating,
        expandedMasters,
        grandMasters,
        targetMembers,
        handleMasterSelect,
        handleInputChange,
        toggleMaster,
        handleCalculate,
        handleReset
    };
}
