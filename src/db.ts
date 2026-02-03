/**
 * db.ts - 데이터베이스 정의 파일 (Database Definition File)
 * 
 * 이 파일은 앱에서 사용하는 데이터의 "형태"(타입)와 "저장소"(데이터베이스)를 정의합니다.
 * This file defines the "shape" (types) of data and the "storage" (database) used in the app.
 * 
 * Dexie.js란? 브라우저의 IndexedDB를 쉽게 사용할 수 있게 해주는 라이브러리입니다.
 * What is Dexie.js? A library that makes it easy to use the browser's IndexedDB.
 * 
 * IndexedDB란? 브라우저에 내장된 로컬 데이터베이스입니다 (오프라인에서도 데이터 저장 가능).
 * What is IndexedDB? A local database built into the browser (can store data offline).
 * 
 * 참고: 이 앱은 Firebase Firestore도 사용하므로, 이 로컬 DB는 주로 마이그레이션용으로 사용됩니다.
 * Note: This app also uses Firebase Firestore, so this local DB is mainly used for migration.
 */

// Dexie - IndexedDB를 쉽게 사용하게 해주는 라이브러리
// Dexie - library that makes IndexedDB easy to use
import Dexie from 'dexie';
import type { Table } from 'dexie';

/**
 * User 인터페이스 - 회원 정보의 형태를 정의합니다
 * User Interface - defines the shape of member information
 * 
 * TypeScript의 interface란? 객체가 어떤 속성을 가져야 하는지 정의하는 "설계도"입니다.
 * What is a TypeScript interface? A "blueprint" that defines what properties an object should have.
 * 
 * 예시 (Example):
 * {
 *   id: 1,
 *   name: "홍길동",
 *   casinoRate: 0.5,
 *   slotRate: 2.5,
 *   losingRate: 20,
 *   parentId: null  // 상위 없음 (대마스터)
 * }
 */
export interface User {
    // Firestore 문서 ID (문자열)
    // Firestore Document ID (string)
    id?: string;

    // 로그인 ID (사용자가 입력하는 아이디, 선택사항)
    // Login ID
    loginId?: string;

    // 닉네임 (필수)
    // Nickname (required)
    name: string;

    // 실명 (선택사항)
    // Real name (optional)
    memberName?: string;

    // 상위 회원의 ID (null이면 최상위)
    // Parent ID (null for top-level)
    parentId?: string | null;

    // 카지노 수수료율 (%)
    casinoRate: number;

    // 슬롯 수수료율 (%)
    slotRate: number;

    // 루징 수수료율 (%)
    losingRate: number;

    // 등급 이름
    level?: string;

    // 메모 (선택사항)
    // Memo (optional)
    memo?: string;

    // 메모 색상 (선택사항: yellow, blue, green, rose, purple)
    // Memo color
    memoColor?: string;
}

/**
 * CalculationLog 인터페이스 - 정산 기록의 형태를 정의합니다
 */
export interface CalculationLog {
    // 고유 ID (문자열)
    id?: string;

    // 정산 날짜
    date: Date;

    // 입력된 카지노 롤링 총액
    casinoRolling: number;

    // 입력된 슬롯 롤링 총액
    slotRolling: number;

    // 입력된 루징 총액
    losingAmount: number;

    // 정산 결과 스냅샷
    results: CalculationResult[];

    // ===== 불러오기 기능용 필드 =====
    // 선택된 대마스터 ID
    selectedMasterId?: string;

    // 회원별 개별 입력값 스냅샷 { userId: { c: '카지노', s: '슬롯', l: '루징' } }
    // Key type changed to string (userId)
    inputs?: Record<string, { c: string, s: string, l: string }>;
}

/**
 * CalculationResult 인터페이스
 */
export interface CalculationResult {
    // 회원 ID (문자열)
    userId: string;

    // 회원 이름
    userName: string;

    // 수수료 금액
    amount: number;

    // 역할: 'self' | 'upper'
    role: 'self' | 'upper';

    // 출처: 어떤 항목에서 발생한 수수료인지
    // Source: which item generated this commission
    source: 'casino' | 'slot' | 'losing';

    // 계산 상세 내역 (선택사항) - 어떻게 계산되었는지 보여주는 문자열
    // Calculation breakdown (optional) - string showing how it was calculated
    breakdown?: string;

    // 수수료 발생 출처 회원명 (선택사항) - 하부 회원 이름
    // Source member name (optional)
    fromUserName?: string;
}

/**
 * MyDatabase 클래스 - Dexie 데이터베이스 정의
 * MyDatabase Class - Dexie database definition
 * 
 * Dexie.js를 사용해 IndexedDB 데이터베이스를 만듭니다.
 * Creates an IndexedDB database using Dexie.js.
 */
export class MyDatabase extends Dexie {
    // 테이블 정의 - 엑셀의 시트(Sheet)와 비슷합니다
    // Table definitions - similar to sheets in Excel
    users!: Table<User>;          // 회원 테이블
    logs!: Table<CalculationLog>; // 정산 기록 테이블

    constructor() {
        // 데이터베이스 이름 설정
        // Set database name
        super('CommissionDB');

        // 스키마(테이블 구조) 정의
        // Define schema (table structure)
        // version(1) - 스키마 버전 (구조 변경 시 버전 증가)
        // version(1) - schema version (increment when structure changes)
        this.version(1).stores({
            // '++id' = 자동 증가 기본키, 'name, parentId' = 인덱스(검색 가능 필드)
            // '++id' = auto-increment primary key, 'name, parentId' = indexes (searchable fields)
            users: '++id, name, parentId',
            logs: '++id, date'
        });
    }
}

// 데이터베이스 인스턴스 생성 및 내보내기
// Create and export database instance
// 다른 파일에서 import { db } from './db' 로 사용 가능
// Can be used in other files with: import { db } from './db'
export const db = new MyDatabase();

