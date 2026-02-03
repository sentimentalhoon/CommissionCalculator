/**
 * UsersPage.tsx - 회원 관리 페이지 (Member Management Page)
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService'; // Import userService

import { Plus, User as UserIcon, Trash2, Edit2, ChevronDown, ChevronRight, UserPlus, MoreVertical } from 'lucide-react';
import UserForm from '../components/UserForm';
import clsx from 'clsx';
import { LEVELS } from '../constants/levels';
import type { User } from '../db';
import { db as firestoreDb } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

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
    onDelete: (id: string) => void;
    onAddChild: (id: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showActions, setShowActions] = useState(false);
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

                        <div className="text-slate-300">
                            <MoreVertical size={16} />
                        </div>
                    </div>

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
    const { } = useAuth()!;
    const [users, setUsers] = useState<User[]>([]);

    // Firestore 실시간 리스너 사용 (Use Firestore Realtime Listener)
    useEffect(() => {
        // 이름순 정렬
        const q = query(collection(firestoreDb, "users"), orderBy('name'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                // ID를 문자열로 사용 (Use ID as string)
                usersData.push({ id: doc.id, ...doc.data() } as User);
            });
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, []);

    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
    const [newParentId, setNewParentId] = useState<string | undefined>(undefined); // Changed to string

    const handleDelete = async (id: string) => { // Changed to string
        // Check for subordinates
        const hasChildren = users?.some(u => u.parentId === id);

        if (hasChildren) {
            alert('하부 회원이 존재하는 회원은 삭제할 수 없습니다.\\n먼저 모든 하부 회원을 삭제해주세요.');
            return;
        }

        if (confirm('정말로 이 회원을 삭제하시겠습니까?')) {
            await userService.deleteUser(id); // Use userService
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

    const handleAddChild = (parentId: string) => { // Changed to string
        setNewParentId(parentId);
        setEditingUser(undefined);
        setShowForm(true);
    }

    const [searchQuery, setSearchQuery] = useState('');

    const userTree = useMemo(() => {
        if (!users) return [];

        const userMap = new Map<string, UserNode>(); // Changed Key to string
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

        // Compute Total Descendants
        const computeDescendants = (node: UserNode): number => {
            let count = node.children.length;
            node.children.forEach(child => {
                count += computeDescendants(child);
            });
            node.totalDescendants = count;
            return count;
        };

        roots.forEach(computeDescendants);

        return roots;
    }, [users]);

    // Search Filtering
    const filteredTree = useMemo(() => {
        if (!searchQuery) return userTree;

        const filterNode = (node: UserNode): UserNode | null => {
            const matches =
                node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (node.loginId && node.loginId.toLowerCase().includes(searchQuery.toLowerCase()));

            const filteredChildren = node.children
                .map(filterNode)
                .filter((child): child is UserNode => child !== null);

            if (matches || filteredChildren.length > 0) {
                return { ...node, children: filteredChildren };
            }
            return null;
        };

        return userTree
            .map(filterNode)
            .filter((node): node is UserNode => node !== null);
    }, [userTree, searchQuery]);

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">회원 관리</h2>
                    <p className="text-sm text-slate-500 font-medium">총 {users?.length || 0}명의 회원이 등록되어 있습니다.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">회원 추가</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <input
                    type="text"
                    placeholder="이름 또는 아이디로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-medium"
                />
            </div>

            <div className="space-y-2">
                {filteredTree.length > 0 ? (
                    filteredTree.map(node => (
                        <UserTreeItem
                            key={node.id}
                            node={node}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                        />
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                            <UserIcon size={32} />
                        </div>
                        <p className="text-slate-500 font-bold mb-1">등록된 회원이 없습니다</p>
                        <p className="text-slate-400 text-sm">새로운 회원을 추가하여 시작해보세요.</p>
                    </div>
                )}
            </div>

            {showForm && (
                <UserForm
                    onClose={() => setShowForm(false)}
                    editUser={editingUser}
                    preselectedParentId={typeof newParentId === 'string' ? newParentId : undefined}
                    restrictToTopLevel={!editingUser && !newParentId && users.length === 0}
                />
            )}
        </div>
    );
}
