import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy
} from 'firebase/firestore';
import { db as firestore } from '../firebase';
import type { User } from '../db';

const COLLECTION_NAME = 'users';

export const userService = {
    // 모든 회원 가져오기
    getAllUsers: async (): Promise<User[]> => {
        const q = query(collection(firestore, COLLECTION_NAME), orderBy('id'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                parentId: data.parentId ? String(data.parentId) : null
            } as User;
        });
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
