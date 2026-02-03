/**
 * calculator.ts - 수수료 계산 핵심 로직 (Core Commission Calculation Logic)
 * 
 * ========================================
 * 🔄 정산 로직 대개편 (Logic Overhaul)
 * ========================================
 * 
 * 변경된 로직 (Updated Logic):
 * 1. 입력값(casino, slot)은 하부 회원이 받은 '수수료(Fee)'입니다.
 * 2. 롤링 금액은 역산합니다: Rolling = Fee / Rate
 * 3. 상부 수익은 차액으로 계산: UpperProfit = UpperFee - LowerFee
 * 4. 루징 수익은 공제 후 쉐어: NetLosing = LosingInput - TotalRollingFee
 */

import type { User, CalculationResult } from '../db';

/**
 * CalculationAmounts 인터페이스 - 입력 금액의 형태
 */
export interface CalculationAmounts {
    casino: number;  // 하부가 받은 카지노 수수료 (Casino Fee received by lower)
    slot: number;    // 하부가 받은 슬롯 수수료 (Slot Fee received by lower)
    losing: number;  // 루징 금액 (Losing Amount)
}

/**
 * BatchInput 인터페이스 - 한 회원의 입력 데이터
 */
export interface BatchInput {
    performerId: number;      // 회원 ID (Member ID) - 최하위 회원
    amounts: CalculationAmounts;  // 입력 금액들 (Input amounts)
}

/**
 * calculateBatchCommission - 메인 수수료 계산 함수
 */
export async function calculateBatchCommission(
    inputs: BatchInput[],
    allUsers: User[]
): Promise<CalculationResult[]> {
    const results: CalculationResult[] = [];

    // 각 최하위 회원(Leaf Node)의 입력에 대해 계산 수행
    for (const input of inputs) {
        const leafUser = allUsers.find(u => u.id === input.performerId);
        if (!leafUser) continue;

        // === 1. 기본 데이터 준비 (Basic Data) ===
        const inputCasinoFee = input.amounts.casino; // 입력된 카지노 수수료
        const inputSlotFee = input.amounts.slot;     // 입력된 슬롯 수수료
        const inputLosingAmt = input.amounts.losing; // 입력된 루징 금액

        // 롤링 금액 역산 (Rolling = Fee / Rate)
        let rollingCasino = 0;
        let msgCasino = '';
        if (inputCasinoFee > 0) {
            if (leafUser.casinoRate > 0) {
                rollingCasino = inputCasinoFee / (leafUser.casinoRate / 100);
            } else {
                msgCasino = `⛔ [오류] 하부(${leafUser.name})의 카지노 요율이 0%입니다.\n수수료(${inputCasinoFee.toLocaleString()})로 롤링을 역산할 수 없습니다.`;
                results.push({
                    userId: leafUser.id!,
                    userName: leafUser.name,
                    role: 'self',
                    source: 'casino',
                    amount: 0,
                    breakdown: msgCasino
                });
            }
        }

        let rollingSlot = 0;
        let msgSlot = '';
        if (inputSlotFee > 0) {
            if (leafUser.slotRate > 0) {
                rollingSlot = inputSlotFee / (leafUser.slotRate / 100);
            } else {
                msgSlot = `⛔ [오류] 하부(${leafUser.name})의 슬롯 요율이 0%입니다.\n수수료(${inputSlotFee.toLocaleString()})로 롤링을 역산할 수 없습니다.`;
                results.push({
                    userId: leafUser.id!,
                    userName: leafUser.name,
                    role: 'self',
                    source: 'slot',
                    amount: 0,
                    breakdown: msgSlot
                });
            }
        }

        // === 2. 상향식 수익 계산 (Bottom-Up Profit Calculation) ===
        // lineage: 직속상위 -> ... -> 대마스터 순서
        const lineage: User[] = [];
        let temp = leafUser;
        while (temp.parentId) {
            const parent = allUsers.find(u => u.id === temp.parentId);
            if (!parent) break;
            lineage.push(parent);
            temp = parent;
        }

        // lineage는 직속상위 -> ... -> 대마스터 순서
        const rootMaster = lineage.length > 0 ? lineage[lineage.length - 1] : leafUser;

        // 공제액 계산 (최상위 마스터 기준 총 롤링 수수료)
        // Deduction = Root's Total Rolling Fee
        const deductionCasino = rollingCasino * (rootMaster.casinoRate / 100);
        const deductionSlot = rollingSlot * (rootMaster.slotRate / 100);
        const totalDeduction = deductionCasino + deductionSlot;

        const netLosing = inputLosingAmt - totalDeduction;

        // === A. 상위 마스터들의 수익 계산 (롤링 수익) ===
        // lineage 순회 (직속 상위부터)
        let prevUser = leafUser;
        let prevCasinoFee = inputCasinoFee;
        let prevSlotFee = inputSlotFee;
        let prevLosingRate = leafUser.losingRate; // 하부의 루징 요율

        for (const upper of lineage) {
            // 1. 카지노 수익
            const currCasinoFee = rollingCasino * (upper.casinoRate / 100);
            const profitCasino = currCasinoFee - prevCasinoFee;

            if (Math.abs(profitCasino) > 0.01) {
                results.push({
                    userId: upper.id!,
                    userName: upper.name,
                    role: 'upper',
                    source: 'casino',
                    amount: profitCasino,
                    breakdown: `[하부: ${prevUser.name}] 수수료: ${prevCasinoFee.toLocaleString()} (요율 ${prevUser.casinoRate}%)\n` +
                        `[역산] 롤링: ${rollingCasino.toLocaleString()}\n` +
                        `[본인: ${upper.name}] 총수수료: ${currCasinoFee.toLocaleString()} (요율 ${upper.casinoRate}%)\n` +
                        `[수익] ${currCasinoFee.toLocaleString()} - ${prevCasinoFee.toLocaleString()} = ${profitCasino.toLocaleString()}`
                });
            } else if (rollingCasino > 0) {
                // 수익이 0이어도 계산 근거 남기기 (디버깅용)
                results.push({
                    userId: upper.id!,
                    userName: upper.name,
                    role: 'upper',
                    source: 'casino',
                    amount: 0,
                    breakdown: `[하부] 요율 ${prevUser.casinoRate}% vs [본인] 요율 ${upper.casinoRate}% (동일하거나 역마진)\n` +
                        `[수익] 0`
                });
            }

            // 2. 슬롯 수익
            const currSlotFee = rollingSlot * (upper.slotRate / 100);
            const profitSlot = currSlotFee - prevSlotFee;

            if (Math.abs(profitSlot) > 0.01) {
                results.push({
                    userId: upper.id!,
                    userName: upper.name,
                    role: 'upper',
                    source: 'slot',
                    amount: profitSlot,
                    breakdown: `[하부: ${prevUser.name}] 수수료: ${prevSlotFee.toLocaleString()} (요율 ${prevUser.slotRate}%)\n` +
                        `[역산] 롤링: ${rollingSlot.toLocaleString()}\n` +
                        `[본인: ${upper.name}] 총수수료: ${currSlotFee.toLocaleString()} (요율 ${upper.slotRate}%)\n` +
                        `[수익] ${currSlotFee.toLocaleString()} - ${prevSlotFee.toLocaleString()} = ${profitSlot.toLocaleString()}`
                });
            }

            // 3. 루징 수익 (Losing Share)
            const rateDiffLosing = upper.losingRate - prevLosingRate;
            if (rateDiffLosing > 0) {
                const profitLosing = netLosing * (rateDiffLosing / 100);

                if (Math.abs(profitLosing) > 0.01) {
                    results.push({
                        userId: upper.id!,
                        userName: upper.name,
                        role: 'upper',
                        source: 'losing',
                        amount: profitLosing,
                        breakdown: `[입력] 루징금액: ${inputLosingAmt.toLocaleString()}\n` +
                            `[공제] 상부 롤링수수료 합계: ${totalDeduction.toLocaleString()} (C:${deductionCasino.toLocaleString()} + S:${deductionSlot.toLocaleString()})\n` +
                            `[순수루징] ${netLosing.toLocaleString()}\n` +
                            `[수익] ${netLosing.toLocaleString()} × (본인${upper.losingRate}% - 하부${prevLosingRate}%) = ${profitLosing.toLocaleString()}`
                    });
                }
            }

            // 다음 단계를 위해 상태 업데이트
            prevUser = upper;
            prevCasinoFee = currCasinoFee;
            prevSlotFee = currSlotFee;
            prevLosingRate = upper.losingRate;
        }
    }

    return results;
}
