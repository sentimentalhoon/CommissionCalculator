export const LEVELS = [
    '대마스터', // Top
    '마스터',
    '본사',
    '부본사'   // Bottom
] as const;

export type UserLevel = typeof LEVELS[number];

export function getNextLevel(currentLevel?: string): UserLevel | null {
    if (!currentLevel) return LEVELS[0]; // No parent = Top
    const idx = LEVELS.indexOf(currentLevel as UserLevel);
    if (idx === -1 || idx >= LEVELS.length - 1) return null; // End of line
    return LEVELS[idx + 1];
}
