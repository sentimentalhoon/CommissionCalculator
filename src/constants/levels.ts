/**
 * levels.ts - 회원 등급 상수 파일 (Member Level Constants File)
 * 
 * 이 파일은 회원 등급의 "계층 구조"를 정의합니다.
 * This file defines the "hierarchy structure" of member levels.
 * 
 * 계층 구조 (Hierarchy):
 * 대마스터 (Grand Master) - 최상위 (Top Level)
 *   └── 마스터 (Master)
 *         └── 본사 (Branch/Headquarters)
 *               └── 부본사 (Sub-Branch) - 최하위 (Bottom Level)
 */

/**
 * LEVELS 배열 - 회원 등급 목록 (Member Level List)
 * 
 * "as const"는 이 배열을 "읽기 전용"으로 만들고,
 * TypeScript가 각 값의 정확한 타입을 알 수 있게 합니다.
 * 
 * "as const" makes this array "read-only" and
 * allows TypeScript to know the exact type of each value.
 * 
 * 배열 순서 = 계층 순서 (높은 등급이 앞에)
 * Array order = hierarchy order (higher level first)
 */
export const LEVELS = [
    '대마스터', // 0번 인덱스 = 최상위 등급 (Index 0 = Top level)
    '마스터',   // 1번 인덱스 (Index 1)
    '본사',     // 2번 인덱스 (Index 2)
    '부본사'    // 3번 인덱스 = 최하위 등급 (Index 3 = Bottom level)
] as const;

/**
 * UserLevel 타입 - 유효한 등급 값만 허용하는 타입
 * UserLevel Type - type that only allows valid level values
 * 
 * typeof LEVELS[number]의 의미:
 * - typeof LEVELS = LEVELS 배열의 타입
 * - [number] = 배열의 모든 인덱스에 해당하는 값들
 * - 결과: '대마스터' | '마스터' | '본사' | '부본사'
 * 
 * 이렇게 하면 오타를 방지할 수 있습니다!
 * This helps prevent typos!
 */
export type UserLevel = typeof LEVELS[number];

/**
 * getNextLevel 함수 - 다음 하위 등급을 반환합니다
 * getNextLevel Function - returns the next lower level
 * 
 * 사용 예시 (Usage example):
 * getNextLevel('대마스터') → '마스터'
 * getNextLevel('마스터') → '본사'
 * getNextLevel('본사') → '부본사'
 * getNextLevel('부본사') → null (더 이상 하위 없음)
 * getNextLevel(undefined) → '대마스터' (상위 없으면 최상위)
 * 
 * @param currentLevel - 현재 등급 (상위 회원의 등급)
 * @returns 다음 등급 또는 null (마지막 등급인 경우)
 */
export function getNextLevel(currentLevel?: string): UserLevel | null {
    // 상위가 없으면 최상위 등급(대마스터) 반환
    // If no parent, return top level (Grand Master)
    if (!currentLevel) return LEVELS[0];

    // 현재 등급의 인덱스 찾기
    // Find the index of current level
    const idx = LEVELS.indexOf(currentLevel as UserLevel);

    // 등급을 찾지 못하거나 이미 마지막 등급이면 null 반환
    // Return null if level not found or already at bottom level
    if (idx === -1 || idx >= LEVELS.length - 1) return null;

    // 다음 등급 반환 (인덱스 + 1)
    // Return next level (index + 1)
    return LEVELS[idx + 1];
}

