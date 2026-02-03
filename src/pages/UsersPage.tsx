/**
 * UsersPage.tsx - 회원 관리 페이지 (Member Management Page)
 * 
 * 이 페이지는 회원 계층 구조를 트리 형태로 보여주고 관리합니다.
 * This page displays and manages the member hierarchy in a tree structure.
 * 
 * 주요 기능 (Main Features):
 * 1. 회원 트리 표시 (Display member tree)
 * 2. 회원 추가/수정/삭제 (Add/Edit/Delete members)
 * 3. 실시간 검색 (Real-time search)
 * 4. 데이터 시딩 (Data seeding) - 테스트용
 * 5. Firebase 마이그레이션 (Firebase migration)
 * 
 * 트리 구조 (Tree Structure):
 * 대마스터 (최상위)
 *   └── 마스터
 *         └── 본사
 *               └── 부본사 (최하위)
 */

// ===== Firebase & 데이터 (Firebase & Data) =====
import { db as firestoreDb } from '../firebase';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';

// ===== 인증 컨텍스트 (Auth Context) =====
import { useAuth } from '../contexts/AuthContext';

// ===== 유틸리티 (Utilities) =====
import { migrateDataToFirestore } from '../utils/migration';

// ===== React 훅들 (React Hooks) =====
import { useEffect, useState, useMemo } from 'react';

// ===== 아이콘 (Icons) =====
import { Plus, User as UserIcon, Trash2, Edit2, ChevronDown, ChevronRight, UserPlus, MoreVertical } from 'lucide-react';

// ===== 컴포넌트 (Components) =====
import UserForm from '../components/UserForm';

// ===== 기타 (Others) =====
import clsx from 'clsx';
import { LEVELS } from '../constants/levels';
import { parseAndSeedData } from '../utils/seedData';
import type { User } from '../db';

interface UserNode extends User {
    children: UserNode[];
    totalDescendants?: number;
}

const UserTreeItem = ({
    node,
    depth = 0,
    onEdit,
    onDelete,
    onAddChild
}: {
    node: UserNode;
    depth?: number;
    onEdit: (u: User) => void;
    onDelete: (id: number) => void;
    onAddChild: (id: number) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showActions, setShowActions] = useState(false); // Mobile toggle for actions
    const hasChildren = node.children.length > 0;

    const currentLevelIdx = LEVELS.indexOf(node.level as any);
    const canAddChild = currentLevelIdx !== -1 && currentLevelIdx < LEVELS.length - 1;

    // Level Color Mapping
    const getLevelStyle = (level?: string) => {
        switch (level) {
            case '대마스터': return "bg-amber-50 border-amber-200 shadow-amber-100";
            case '마스터': return "bg-emerald-50 border-emerald-200 shadow-emerald-100";
            case '본사': return "bg-sky-50 border-sky-200 shadow-sky-100";
            case '부본사': return "bg-slate-50 border-slate-200 shadow-slate-100";
            default: return "bg-white border-slate-200";
        }
    };

    return (
        <div className="select-none">
            <div
                className={clsx(
                    "flex items-start gap-2 p-2.5 rounded-xl border border-transparent transition-all",
                    "hover:bg-slate-50 hover:border-slate-100",
                    depth > 0 && "ml-2 pl-0 border-l border-l-slate-100 rounded-l-none"
                )}
            >
                {/* Expand/Collapse Toggle */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={clsx(
                        "mt-1 p-0.5 rounded text-slate-400 active:text-primary-600 transition-colors shrink-0",
                        !hasChildren && "invisible"
                    )}
                >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {/* User Card Content */}
                <div
                    className={clsx(
                        "flex-1 p-3 rounded-xl border shadow-sm relative overflow-hidden active:scale-[0.99] transition-transform",
                        getLevelStyle(node.level)
                    )}
                    onClick={() => setShowActions(!showActions)}
                >
                    {/* Visual connection line for children */}
                    {depth > 0 && (
                        <div className="absolute -left-3 top-4 w-2 h-px bg-slate-200" />
                    )}

                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                            {/* Badge Count - Darker bg for contrast */}
                            <div className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-slate-600 font-bold text-[10px] border border-black/5 shrink-0 mt-0.5">
                                {node.children.length > 0 ? node.children.length : '-'}
                            </div>

                            <div className="space-y-1">
                                <div className="font-bold text-slate-800 text-base leading-tight">
                                    {node.name}
                                    {node.loginId && <span className="text-sm font-normal text-slate-400 ml-1">({node.loginId})</span>}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md inline-block">
                                    {node.level || 'Unknown'}
                                </div>
                                {node.memberName && (
                                    <div className="text-[10px] text-slate-400 font-medium -mt-0.5">
                                        {node.memberName}
                                    </div>
                                )}
                                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                    팀원: {node.totalDescendants?.toLocaleString() || 0}명
                                </div>

                                {/* Rates Grid - Compact View */}
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 whitespace-nowrap">
                                        C <span className="font-bold">{node.casinoRate}%</span>
                                    </span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 whitespace-nowrap">
                                        S <span className="font-bold">{node.slotRate}%</span>
                                    </span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 whitespace-nowrap">
                                        L <span className="font-bold">{node.losingRate}%</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Action Toggle Icon */}
                        <div className="text-slate-300">
                            <MoreVertical size={16} />
                        </div>
                    </div>

                    {/* Action Bar - Expands when tapped */}
                    {showActions && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end gap-2 animate-in slide-in-from-top-2 duration-200">
                            {canAddChild && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        node.id && onAddChild(node.id);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold active:bg-primary-100"
                                >
                                    <UserPlus size={14} /> 하부추가
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(node);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold active:bg-slate-100"
                            >
                                <Edit2 size={14} /> 수정
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    node.id && onDelete(node.id);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold active:bg-red-100"
                            >
                                <Trash2 size={14} /> 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recursive Children - Reduced padding */}
            {hasChildren && isExpanded && (
                <div className="relative">
                    <div className="absolute left-[13px] top-0 bottom-4 w-px bg-slate-100" />
                    <div className="pl-1">
                        {node.children.map(child => (
                            <UserTreeItem
                                key={child.id}
                                node={child}
                                depth={depth + 1}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onAddChild={onAddChild}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function UsersPage() {
    const { isAdmin } = useAuth()!;
    const [users, setUsers] = useState<User[]>([]);

    // Switch to Firestore Realtime Listener
    useEffect(() => {
        const q = query(collection(firestoreDb, "users"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: parseInt(doc.id), ...doc.data() } as User);
            });
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
    const [newParentId, setNewParentId] = useState<number | undefined>(undefined);

    const handleDelete = async (id: number) => {
        // Check for subordinates
        const hasChildren = users?.some(u => u.parentId === id);

        if (hasChildren) {
            alert('하부 회원이 존재하는 회원은 삭제할 수 없습니다.\\n먼저 모든 하부 회원을 삭제해주세요.');
            return;
        }

        if (confirm('정말로 이 회원을 삭제하시겠습니까?')) {
            await deleteDoc(doc(firestoreDb, "users", id.toString()));
        }
    };

    const handleEdit = (user: User) => {
        setNewParentId(undefined);
        setEditingUser(user);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setNewParentId(undefined);
        setEditingUser(undefined);
        setShowForm(true);
    }

    const handleAddChild = (parentId: number) => {
        setNewParentId(parentId);
        setEditingUser(undefined);
        setShowForm(true);
    }

    const [searchQuery, setSearchQuery] = useState('');

    const userTree = useMemo(() => {
        if (!users) return [];

        const userMap = new Map<number, UserNode>();
        const roots: UserNode[] = [];

        users.forEach(u => {
            if (u.id) userMap.set(u.id, { ...u, children: [] });
        });

        users.forEach(u => {
            const node = userMap.get(u.id!);
            if (!node) return;

            if (u.parentId) {
                const parent = userMap.get(u.parentId);
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        // 1. Compute Total Descendants (Bottom-Up)
        const computeStats = (node: UserNode): number => {
            let count = 0;
            node.children.forEach(child => {
                count += 1 + computeStats(child); // 1 (child itself) + sub-children
            });
            node.totalDescendants = count;
            return count;
        };

        roots.forEach(root => computeStats(root));

        // 2. Sort by Total Descendants (Recursive)
        const sortNodes = (nodes: UserNode[]) => {
            nodes.sort((a, b) => (b.totalDescendants || 0) - (a.totalDescendants || 0));
            nodes.forEach(node => sortNodes(node.children));
        };

        sortNodes(roots);

        // Search Filter Logic
        if (!searchQuery.trim()) return roots;

        const lowerQuery = searchQuery.toLowerCase();

        const isMatch = (node: UserNode) => {
            const nameMatch = node.name.toLowerCase().includes(lowerQuery);
            const idMatch = node.loginId ? node.loginId.toLowerCase().includes(lowerQuery) : false;
            const memberMatch = node.memberName ? node.memberName.toLowerCase().includes(lowerQuery) : false;
            return nameMatch || idMatch || memberMatch;
        };

        const filterNodes = (nodes: UserNode[], parentMatched: boolean): UserNode[] => {
            return nodes.reduce((acc, node) => {
                const selfMatch = isMatch(node);
                const shouldKeepChildren = parentMatched || selfMatch;

                // If parent matched or self matched, we want to keep ALL descendants (pass true)
                // If not, we only keep descendants that have a match (pass false and check result)
                const filteredChildren = filterNodes(node.children, shouldKeepChildren);

                if (shouldKeepChildren || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren
                    });
                }
                return acc;
            }, [] as UserNode[]);
        };

        return filterNodes(roots, false);
    }, [users, searchQuery]);

    return (
        <div className="space-y-3 pb-24">
            <div className="flex justify-between items-center sticky top-0 bg-slate-50/95 backdrop-blur-sm py-3 px-1 z-10 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">팀 관리</h2>
                    <button
                        onClick={() => {
                            if (confirm('기존 데이터가 모두 삭제되고 초기 데이터가 로드됩니다. 계속하시겠습니까?')) {
                                parseAndSeedData();
                            }
                        }}
                        className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-1 rounded hover:bg-primary-200 hidden"
                    >
                        데이터 로드
                    </button>

                    {/* Admin Only Migration Button */}
                    {isAdmin && (
                        <button
                            onClick={async () => {
                                if (confirm('현재 기기의 데이터를 서버로 업로드하시겠습니까? (기존 서버 데이터는 덮어씌워질 수 있습니다)')) {
                                    const result = await migrateDataToFirestore();
                                    if (result.success) {
                                        alert(`성공적으로 업로드되었습니다. (${result.userCount}명)`);
                                    } else {
                                        alert('업로드 실패. 콘솔을 확인하세요.');
                                    }
                                }
                            }}
                            className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 shadow-sm"
                        >
                            서버 동기화
                        </button>
                    )}
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-primary-600 text-white p-2.5 rounded-full shadow-lg shadow-primary-600/30 active:scale-95 transition-all"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Search Input */}
            <div className="px-1 mb-2">
                <input
                    type="text"
                    placeholder="이름, 아이디, 실명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm font-medium"
                />
            </div>

            {!users || users.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mx-1">
                    <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <UserIcon size={32} className="text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-700">팀이 비어있습니다</p>
                        <p className="text-sm mt-1">+ 버튼을 눌러 회원을 등록하세요</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-1 relative pr-1">
                    {userTree.map(root => (
                        <UserTreeItem
                            key={root.id}
                            node={root}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                        />
                    ))}
                </div>
            )}

            {showForm && (
                <UserForm
                    onClose={() => {
                        setShowForm(false);
                        setEditingUser(undefined);
                        setNewParentId(undefined);
                    }}
                    editUser={editingUser}
                    preselectedParentId={newParentId}
                    restrictToTopLevel={!editingUser && !newParentId}
                />
            )}
        </div>
    );
}
