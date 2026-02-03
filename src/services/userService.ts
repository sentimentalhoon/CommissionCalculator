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
import { db } from '../firebase';
import type { User } from '../db';

const COLLECTION_NAME = 'users';

export const userService = {
    // 모든 회원 가져오기
    getAllUsers: async (): Promise<User[]> => {
        const q = query(collection(db, COLLECTION_NAME), orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as User));
    },

    // 회원 추가
    addUser: async (user: Omit<User, 'id'>): Promise<string> => {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), user);
        return docRef.id;
    },

    // 회원 수정
    updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
        const userRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(userRef, updates);
    },

    // 회원 삭제
    deleteUser: async (id: string): Promise<void> => {
        const userRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(userRef);
    }
};
