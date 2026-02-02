import { db as dexieDb } from '../db';
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
