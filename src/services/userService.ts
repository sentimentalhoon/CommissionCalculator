import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query
} from 'firebase/firestore';
import { db as firestore } from '../firebase';
import type { User } from '../db';

const COLLECTION_NAME = 'users';

export const userService = {
    // 모든 회원 가져오기
    getAllUsers: async (): Promise<User[]> => {
        const q = query(collection(firestore, COLLECTION_NAME));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id, // ID is string in Firestore
                // We trust the numeric ID was saved in the 'id' field for sorting
                // New users have createdAt, migrated users have numeric id in data
                _sortId: data.createdAt || (typeof data.id === 'number' ? data.id : 0), 
                parentId: data.parentId ? String(data.parentId) : null
            } as User & { _sortId: number };
        });
        
        // Client-side sort by ID/Time
        return users.sort((a, b) => a._sortId - b._sortId);
    },

    // 회원 추가
    addUser: async (user: Omit<User, 'id'>): Promise<string> => {
        const docRef = await addDoc(collection(firestore, COLLECTION_NAME), user);
        return docRef.id;
    },

    // 회원 수정
    updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
        if (typeof id !== 'string' || !id) {
            console.error("userService.updateUser: Invalid ID provided", { id, type: typeof id });
            throw new Error(`Invalid User ID: ${id} (${typeof id})`);
        }
        const userRef = doc(firestore, COLLECTION_NAME, id);
        await updateDoc(userRef, updates);
    },

    // 회원 삭제
    deleteUser: async (id: string): Promise<void> => {
        const userRef = doc(firestore, COLLECTION_NAME, id);
        await deleteDoc(userRef);
    }
};
