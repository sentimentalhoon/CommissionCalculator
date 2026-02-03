/**
 * migration.ts - 데이터 마이그레이션 유틸리티 (Data Migration Utility)
 * 
 * 로컬 IndexedDB(Dexie)에서 Firebase Firestore로 데이터를 이전합니다.
 * Migrates data from local IndexedDB (Dexie) to Firebase Firestore.
 * 
 * 사용 시점 (When to use):
 * - 로컬에서 개발하다가 클라우드로 전환할 때
 *   When switching from local development to cloud
 * - 기존 데이터를 Firebase로 백업할 때
 *   When backing up existing data to Firebase
 * 
 * Firestore 배치 쓰기 (Firestore Batch Write):
 * - writeBatch: 여러 문서를 한 번에 쓰기 (성능 최적화)
 *   Write multiple documents at once (performance optimization)
 * - 최대 500개 까지 배치 가능 (여기서는 499개 단위로 커밋)
 *   Max 500 per batch (committing every 499 here)
 */

// 로컬 Dexie 데이터베이스 (Local Dexie database)
import { db as dexieDb } from '../db';

// Firebase Firestore (클라우드 데이터베이스)
import { db as firestoreDb } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';

export async function migrateDataToFirestore() {
    try {
        const users = await dexieDb.users.toArray();

        let batchCount = 0;
        let currentBatch = writeBatch(firestoreDb);

        // Migrate Users
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const userRef = doc(firestoreDb, "users", user.id!.toString());

            // Clean up undefined values (Firestore doesn't like undefined)
            const userData = JSON.parse(JSON.stringify(user));
            if (user.parentId === undefined) delete userData.parentId;

            currentBatch.set(userRef, userData);
            batchCount++;

            if (batchCount === 499) {
                await currentBatch.commit();
                currentBatch = writeBatch(firestoreDb);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await currentBatch.commit();
        }

        console.log(`Migrated ${users.length} users successfully.`);
        return { success: true, userCount: users.length };

    } catch (error) {
        console.error("Migration failed:", error);
        return { success: false, error };
    }
}
