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
        // (요율이 0이면 롤링도 0 처리)
        const rollingCasino = leafUser.casinoRate > 0 ? inputCasinoFee / (leafUser.casinoRate / 100) : 0;
        const rollingSlot = leafUser.slotRate > 0 ? inputSlotFee / (leafUser.slotRate / 100) : 0;

        // === 2. 상향식 수익 계산 (Bottom-Up Profit Calculation) ===
        // 루징 공제액 계산을 위한 변수 (최상위 마스터의 롤링 수수료 총액을 찾아야 함)
        // 각 단계마다 계산되는 Fee를 추적하다가, 마지막(최상위)의 Fee를 공제액으로 사용?
        // 아니면 "상부의 casino fee"라는게 직속 상위의 Fee인가? 
        // User said: "x 에서 상부의 casino fee, slot fee 를 뺀 후에 ... 그 Fee 에 대한 상부의 Fee 도 계산되어야만 해."
        // 해석: 루징은 "순수익" 개념이므로, 이 라인에서 지급된(혹은 회사가 가져간) 모든 롤링 수수료를 뺀 나머지를 루징으로 본다.
        // 그러므로 이 라인의 최상위(루트) 마스터가 가져가는 Total Fee가 공제액이 된다. (왜냐하면 그 안에 하부 몫도 다 포함되니까)

        // 먼저 상위 라인을 미리 순회하여 루트 Fee를 구할 수도 있지만,
        // 여기서는 Bottom-Up 루프를 돌면서 상위로 갈 때마다 Fee를 갱신하고, 기록한다.
        // Losing 처리는 별도로 루프가 끝난 후에 하거나, 루프 내에서 처리하되 공제액을 어떻게 알지?
        // => 루징 계산은 상위로 올라가면서 "누적 공제"가 아니라 "고정된 공제액(루트 수수료)"을 뺴는게 맞을듯 하다.
        // 일단 상위 경로를 배열로 만들자.

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
                    breakdown: `[하부] 수수료: ${prevCasinoFee.toLocaleString()} (요율 ${prevUser.casinoRate}%)\n` +
                        `[역산] 롤링: ${rollingCasino.toLocaleString()}\n` +
                        `[본인] 총수수료: ${currCasinoFee.toLocaleString()} (요율 ${upper.casinoRate}%)\n` +
                        `[수익] ${currCasinoFee.toLocaleString()} - ${prevCasinoFee.toLocaleString()} = ${profitCasino.toLocaleString()}`
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
                    breakdown: `[하부] 수수료: ${prevSlotFee.toLocaleString()} (요율 ${prevUser.slotRate}%)\n` +
                        `[역산] 롤링: ${rollingSlot.toLocaleString()}\n` +
                        `[본인] 총수수료: ${currSlotFee.toLocaleString()} (요율 ${upper.slotRate}%)\n` +
                        `[수익] ${currSlotFee.toLocaleString()} - ${prevSlotFee.toLocaleString()} = ${profitSlot.toLocaleString()}`
                });
            }

            // 3. 루징 수익 (Losing Share)
            // 공제된 순수 루징 금액에 대해 요율 차이만큼 가져감
            // 순수 루징이 0보다 작으면 수익 없음 (또는 마이너스?) -> 보통 마이너스도 정산함.
            // Share = NetLosing * (MyRate - ChildRate)
            // User requested: "Losing 칸에 입력된 % 만큼 나누어 먹는거야" -> This likely refers to rates in DB.

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
