/**
 * UserForm.tsx - 회원 등록/수정 폼 컴포넌트
 */

import { useState, useEffect } from 'react';
import { userService } from '../services/userService'; // Import userService
import clsx from 'clsx';
import { X, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { getNextLevel, LEVELS } from '../constants/levels';
import type { User } from '../db';

interface UserFormProps {
    onClose: () => void;
    editUser?: User;
    preselectedParentId?: string; // Changed to string
    restrictToTopLevel?: boolean;
}

export default function UserForm({ onClose, editUser, preselectedParentId, restrictToTopLevel }: UserFormProps) {
    const [users, setUsers] = useState<User[]>([]);

    // Fetch users using userService
    useEffect(() => {
        const fetchUsers = async () => {
            const data = await userService.getAllUsers();
            setUsers(data);
        };
        fetchUsers();
    }, []);

    const [name, setName] = useState(editUser?.name || '');
    const [loginId, setLoginId] = useState(editUser?.loginId || '');
    const [memberName, setMemberName] = useState(editUser?.memberName || '');
    const [casinoRate, setCasinoRate] = useState(editUser?.casinoRate?.toString() || '0');
    const [slotRate, setSlotRate] = useState(editUser?.slotRate?.toString() || '0');
    const [losingRate, setLosingRate] = useState(editUser?.losingRate?.toString() || '0');
    const [parentId, setParentId] = useState<string>(
        editUser?.parentId || preselectedParentId || '' // Uses string directly
    );
    const [isClosing, setIsClosing] = useState(false);

    // Derived State: Calculate Level based on Parent
    const parentUser = users.find(u => u.id === parentId);

    let calculatedLevel = getNextLevel(parentUser?.level);

    // Edge case: If no parent selected, it must be Top Level
    if (!parentId) {
        calculatedLevel = LEVELS[0];
    }

    // Validation: Check if rates exceed parent's rates
    const isRateInvalid = parentUser && (
        parseFloat(casinoRate) > parentUser.casinoRate ||
        parseFloat(slotRate) > parentUser.slotRate ||
        parseFloat(losingRate) > parentUser.losingRate
    );

    const isLevelLimitReached = !calculatedLevel;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || isLevelLimitReached || !calculatedLevel || isRateInvalid) return;

        // Construct User Data
        const userData: Omit<User, 'id'> = {
            name,
            loginId: loginId || undefined,
            memberName: memberName || undefined,
            casinoRate: parseFloat(casinoRate),
            slotRate: parseFloat(slotRate),
            losingRate: parseFloat(losingRate),
            parentId: parentId || null,
            level: calculatedLevel
        };

        try {
            if (editUser && editUser.id) {
                // Update
                await userService.updateUser(editUser.id, userData);
            } else {
                // Create
                await userService.addUser(userData);
            }
            handleClose();
        } catch (error) {
            console.error("Failed to save user", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <>
            <div
                className={clsx(
                    "fixed inset-0 bg-black/60 z-50 transition-opacity duration-300",
                    isClosing ? "opacity-0" : "opacity-100"
                )}
                onClick={handleClose}
            />

            <div
                className={clsx(
                    "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform",
                    isClosing ? "translate-y-full" : "translate-y-0"
                )}
                style={{ maxHeight: '90vh' }}
            >
                <div className="w-full flex justify-center pt-3 pb-1" onClick={handleClose}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                <div className="p-6 overflow-y-auto max-h-[85vh] space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {editUser ? '회원 수정' : restrictToTopLevel ? `신규 ${LEVELS[0]}` : '신규 회원 등록'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {editUser ? '정보를 수정합니다' : '새로운 회원을 구조에 등록합니다'}
                            </p>
                        </div>
                        <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
                            <X size={20} />
                        </button>
                    </div>

                    {isLevelLimitReached ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold">추가 불가</p>
                                <p><strong>{parentUser?.name}</strong> 하위에 더 이상 회원을 추가할 수 없습니다. (최대 단계 도달)</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">아이디 <span className="text-slate-400 font-normal normal-case">(선택)</span></label>
                                            <input
                                                type="text"
                                                value={loginId}
                                                onChange={e => setLoginId(e.target.value)}
                                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-semibold text-slate-800"
                                                placeholder="아이디"
                                                autoFocus
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">닉네임 (표시이름) <span className="text-primary-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-semibold text-slate-800"
                                                placeholder="닉네임"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">실명 <span className="text-slate-400 font-normal normal-case">(선택)</span></label>
                                            <input
                                                type="text"
                                                value={memberName}
                                                onChange={e => setMemberName(e.target.value)}
                                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-semibold text-slate-800"
                                                placeholder="실명"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">상위 회원 (Upline)</label>
                                    <div className="relative">
                                        <select
                                            value={parentId}
                                            onChange={e => setParentId(e.target.value)}
                                            className="w-full p-4 appearance-none rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 outline-none font-medium text-slate-700"
                                            disabled={!!preselectedParentId || restrictToTopLevel}
                                        >
                                            <option value="">없음 (최상위 - {LEVELS[0]})</option>
                                            {users.filter(u => u.id !== editUser?.id).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.level})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                    </div>
                                    {restrictToTopLevel && (
                                        <p className="text-xs text-primary-600 mt-1.5 font-medium px-1">
                                            * 새로운 최상위 관리자를 생성합니다.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">요율 설정 (Commission %)</label>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">소수점 가능</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className={clsx("text-[10px] font-bold pl-1 transition-colors",
                                            parentUser && parseFloat(casinoRate) > parentUser.casinoRate ? "text-red-600" : "text-blue-600"
                                        )}>
                                            카지노 (최대: {parentUser ? parentUser.casinoRate : '∞'})
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            value={casinoRate}
                                            onChange={e => setCasinoRate(e.target.value)}
                                            className={clsx(
                                                "w-full p-3 rounded-xl border text-center font-bold focus:ring-2 outline-none transition-all",
                                                parentUser && parseFloat(casinoRate) > parentUser.casinoRate
                                                    ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500/20"
                                                    : "border-slate-200 text-blue-900 focus:border-blue-500 focus:ring-blue-500/20"
                                            )}
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={clsx("text-[10px] font-bold pl-1 transition-colors",
                                            parentUser && parseFloat(slotRate) > parentUser.slotRate ? "text-red-600" : "text-purple-600"
                                        )}>
                                            슬롯 (최대: {parentUser ? parentUser.slotRate : '∞'})
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            value={slotRate}
                                            onChange={e => setSlotRate(e.target.value)}
                                            className={clsx(
                                                "w-full p-3 rounded-xl border text-center font-bold focus:ring-2 outline-none transition-all",
                                                parentUser && parseFloat(slotRate) > parentUser.slotRate
                                                    ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500/20"
                                                    : "border-slate-200 text-purple-900 focus:border-purple-500 focus:ring-purple-500/20"
                                            )}
                                            placeholder="0.0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={clsx("text-[10px] font-bold pl-1 transition-colors",
                                            parentUser && parseFloat(losingRate) > parentUser.losingRate ? "text-red-600" : "text-rose-600"
                                        )}>
                                            루징 (최대: {parentUser ? parentUser.losingRate : '∞'})
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            value={losingRate}
                                            onChange={e => setLosingRate(e.target.value)}
                                            className={clsx(
                                                "w-full p-3 rounded-xl border text-center font-bold focus:ring-2 outline-none transition-all",
                                                parentUser && parseFloat(losingRate) > parentUser.losingRate
                                                    ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500/20"
                                                    : "border-slate-200 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20"
                                            )}
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                {isRateInvalid && (
                                    <p className="text-xs text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        <span>설정된 요율이 상위 회원의 요율을 초과할 수 없습니다.</span>
                                    </p>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">부여 등급</span>
                                <div className="text-lg font-black text-slate-800">
                                    {calculatedLevel}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!!isRateInvalid || !calculatedLevel}
                                className={clsx(
                                    "w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 text-lg",
                                    isRateInvalid || !calculatedLevel
                                        ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed"
                                        : "bg-slate-900 text-white shadow-slate-900/20 active:scale-[0.98]"
                                )}
                            >
                                <Check size={24} />
                                <span>저장하기</span>
                            </button>
                        </form>
                    )}

                    <div className="h-6" />
                </div>
            </div>
        </>
    );
}
