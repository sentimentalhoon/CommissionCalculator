/**
 * Dashboard.tsx - 대시보드 페이지 (Dashboard Page)
 * 
 * 앱의 첫 화면으로, 주요 통계와 최근 활동을 보여줍니다.
 * The app's home screen, showing key statistics and recent activity.
 * 
 * 표시 정보 (Displayed Information):
 * 1. 환영 메시지 (Welcome message)
 * 2. 총 회원수 (Total member count) - Firestore 실시간 연동
 * 3. 정산 횟수 (Settlement count) - Firestore 실시간 연동
 * 4. 최근 정산 기록 (Recent settlement history) - 최대 5개
 * 
 * Firestore 실시간 리스너 (Firestore Real-time Listeners):
 * - onSnapshot: 데이터 변경 시 자동으로 UI 업데이트
 *   Auto-updates UI when data changes
 */

// React 훅들 (React Hooks)
import { useState, useEffect } from 'react';

// Firebase Firestore (클라우드 데이터베이스)
import { db as firestoreDb } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

// 타입 정의 (Type definitions)
import type { CalculationLog } from '../db';

// 날짜 포맷 라이브러리 (Date formatting library)
import { format } from 'date-fns';

// 아이콘 (Icons)
import { TrendingUp, Users, History, RefreshCw } from 'lucide-react';

// 라우팅 (Routing) - 불러오기 기능용
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const [userCount, setUserCount] = useState(0);
    // docId를 포함하는 확장 타입 (Extended type including docId for restore)
    const [logs, setLogs] = useState<(CalculationLog & { docId: string })[]>([]);
    const [logCount, setLogCount] = useState(0);

    // 불러오기 기능용 navigate (Navigate for restore feature)
    const navigate = useNavigate();

    // Fetch users count from Firestore
    useEffect(() => {
        const q = query(collection(firestoreDb, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setUserCount(querySnapshot.size);
        });
        return () => unsubscribe();
    }, []);

    // Fetch logs from Firestore
    useEffect(() => {
        const q = query(collection(firestoreDb, "logs"), orderBy("date", "desc"), limit(5));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData: (CalculationLog & { docId: string })[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                logsData.push({
                    id: parseInt(docSnap.id) || Date.now(),
                    docId: docSnap.id, // Firestore 문서 ID 저장 (for restore)
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                    casinoRolling: data.casinoRolling || 0,
                    slotRolling: data.slotRolling || 0,
                    losingAmount: data.losingAmount || 0,
                    results: data.results || [],
                    // 불러오기 가능 여부 확인용 (Check if restore is available)
                    selectedMasterId: data.selectedMasterId,
                    inputs: data.inputs
                } as CalculationLog & { docId: string });
            });
            setLogs(logsData);
            setLogCount(logsData.length); // For now, show count of fetched logs
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-lg shadow-primary-500/30">
                <h2 className="text-2xl font-bold mb-2">안녕하세요!</h2>
                <p className="opacity-90">오늘도 수수료 정산을 시작해볼까요?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-full mb-2">
                        <Users size={20} />
                    </div>
                    <div className="text-slate-500 text-xs font-medium mb-1">총 회원수</div>
                    <div className="text-2xl font-bold text-slate-800">{userCount || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-full mb-2">
                        <TrendingUp size={20} />
                    </div>
                    <div className="text-slate-500 text-xs font-medium mb-1">정산 횟수</div>
                    <div className="text-2xl font-bold text-slate-800">{logCount || 0}</div>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-4">
                    <History size={20} className="text-slate-400" />
                    <h3 className="font-bold text-slate-700">최근 정산 기록</h3>
                </div>

                {!logs || logs.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">
                        아직 정산 기록이 없습니다.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map(log => (
                            <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-bold text-slate-800">
                                        {format(log.date, 'MMM d, yyyy h:mm a')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* 불러오기 버튼 - inputs이 있는 경우에만 표시 */}
                                        {/* Load button - only show if inputs are saved */}
                                        {log.inputs && (
                                            <button
                                                onClick={() => navigate(`/calculator?logId=${log.docId}`)}
                                                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
                                                title="이 기록을 정산 페이지로 불러오기"
                                            >
                                                <RefreshCw size={12} />
                                                불러오기
                                            </button>
                                        )}
                                        <div className="text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded text-sm">
                                            Total: ${((log.casinoRolling || 0) + (log.slotRolling || 0) + (log.losingAmount || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {log.results.slice(0, 2).map((r, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-slate-500">
                                            <span>{r.userName} ({r.role === 'self' ? '본인' : '상위'})</span>
                                            <span className="font-medium text-slate-700">${r.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {log.results.length > 2 && (
                                        <div className="text-xs text-slate-400 mt-1">
                                            + {log.results.length - 2} 명 더보기
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
