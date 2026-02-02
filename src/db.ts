import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface User {
    id?: number;
    loginId?: string; // User ID (Optional)
    name: string; // Nickname
    memberName?: string; // Real Name (Optional)
    parentId?: number | null; // ID of the upper user
    casinoRate: number;
    slotRate: number;
    losingRate: number;
    level?: string; // Optional rank name
}

export interface CalculationLog {
    id?: number;
    date: Date;
    casinoRolling: number;
    slotRolling: number;
    losingAmount: number;
    results: CalculationResult[]; // Snapshot of who got what
}


export interface CalculationResult {
    userId: number;
    userName: string;
    amount: number;
    role: 'self' | 'upper';
    source: 'casino' | 'slot' | 'losing';
    breakdown?: string; // Detailed calculation formula
}

export class MyDatabase extends Dexie {
    users!: Table<User>;
    logs!: Table<CalculationLog>;

    constructor() {
        super('CommissionDB');
        this.version(1).stores({
            users: '++id, name, parentId',
            logs: '++id, date'
        });
    }
}

export const db = new MyDatabase();
