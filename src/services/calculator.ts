/**
 * calculator.ts - 수수료 계산 핵심 로직 (Core Commission Calculation Logic)
 * 
 * 이 파일은 정산 시스템의 "두뇌"입니다.
 * This file is the "brain" of the settlement system.
 * 
 * ========================================
 * 📊 수수료 계산 방식 설명 (Commission Calculation Explanation)
 * ========================================
 * 
 * 이 시스템은 "다단계 차등 수수료" 방식을 사용합니다.
 * This system uses "multi-level differential commission".
 * 
 * 예시 구조 (Example Structure):
 * 대마스터 A (Casino: 1.2%)
 *   └── 마스터 B (Casino: 1.2%)
 *         └── 본사 C (Casino: 1.0%)
 *               └── 부본사 D (Casino: 0.5%)
 * 
 * D가 Casino 10,000,000 롤링을 발생시키면:
 * If D generates Casino 10,000,000 rolling:
 * 
 * 1. D 본인 수수료: 10,000,000 × 0.5% = 50,000
 *    D's own commission: 10,000,000 × 0.5% = 50,000
 * 
 * 2. C 차등 수수료: 10,000,000 × (1.0% - 0.5%) = 50,000
 *    C's differential: 10,000,000 × (1.0% - 0.5%) = 50,000
 * 
 * 3. B 차등 수수료: 10,000,000 × (1.2% - 1.0%) = 20,000
 *    B's differential: 10,000,000 × (1.2% - 1.0%) = 20,000
 * 
 * 4. A 차등 수수료: 10,000,000 × (1.2% - 1.2%) = 0 (동일 수수료율)
 *    A's differential: 10,000,000 × (1.2% - 1.2%) = 0 (same rate)
 * 
 * ========================================
 * 📉 루징(Losing) 수수료 특별 계산
 * ========================================
 * 
 * 루징 수수료는 특별합니다:
 * Losing commission is special:
 * 
 * 루징 베이스 = 루징 금액 - (카지노 수수료 + 슬롯 수수료)
 * Losing Base = Losing Amount - (Casino Commission + Slot Commission)
 * 
 * 왜? 이미 카지노/슬롯으로 지급한 수수료를 빼고 계산해야 하기 때문
 * Why? Because we need to subtract already paid casino/slot commissions
 */

// 타입 가져오기 (Import types)
import type { User, CalculationResult } from '../db';

/**
 * CalculationAmounts 인터페이스 - 입력 금액의 형태
 * CalculationAmounts Interface - shape of input amounts
 */
export interface CalculationAmounts {
    casino: number;  // 카지노 롤링 금액 (Casino rolling amount)
    slot: number;    // 슬롯 롤링 금액 (Slot rolling amount)
    losing: number;  // 루징 금액 (Losing amount)
}

/**
 * BatchInput 인터페이스 - 한 회원의 입력 데이터
 * BatchInput Interface - input data for one member
 */
export interface BatchInput {
    performerId: number;      // 회원 ID (Member ID)
    amounts: CalculationAmounts;  // 입력 금액들 (Input amounts)
}

/**
 * calculateBatchCommission - 메인 수수료 계산 함수
 * calculateBatchCommission - main commission calculation function
 * 
 * @param inputs - 각 회원의 입력 금액 배열 (Array of each member's input amounts)
 * @param allUsers - 전체 회원 목록 (All members list)
 * @returns 계산된 수수료 결과 배열 (Array of calculated commission results)
 * 
 * 계산 과정 (Calculation Process):
 * 1. NET 롤링 계산 (본인 입력 - 하위 입력 합계)
 * 2. 본인 수수료 계산
 * 3. 상위로 올라가며 차등 수수료 계산
 */
export async function calculateBatchCommission(
    inputs: BatchInput[],
    allUsers: User[]
): Promise<CalculationResult[]> {
    // ===================================================================
    // 결과를 저장할 Map (키: "userId-source", 값: 결과 객체)
    // Map to store results (key: "userId-source", value: result object)
    // ===================================================================
    const resultsMap = new Map<string, CalculationResult>();

    // ===================================================================
    // 1단계: 입력 데이터를 Map으로 변환 (빠른 조회를 위해)
    // Step 1: Convert input data to Map (for fast lookup)
    // ===================================================================
    const inputMap = new Map<number, CalculationAmounts>();
    inputs.forEach(i => inputMap.set(i.performerId, i.amounts));

    // ===================================================================
    // 2단계: NET 롤링 계산
    // Step 2: Calculate NET Rolling
    // 
    // NET = 본인 입력 - 직계 하위 입력 합계
    // NET = Own Input - Sum of Direct Children's Inputs
    // 
    // 왜 NET을 계산하나요?
    // Why calculate NET?
    // 
    // 예: 마스터가 100억, 본사가 70억을 입력하면
    //     마스터의 "순수 본인분"은 30억입니다 (100억 - 70억)
    //     70억은 본사를 통해 이미 계산되므로 중복 방지
    // ===================================================================
    const netInputs: BatchInput[] = [];

    for (const input of inputs) {
        // 해당 회원 찾기
        // Find the member
        const user = allUsers.find(u => u.id === input.performerId);
        if (!user) continue;

        // 직계 하위 회원들 찾기 (parentId가 현재 회원인 사람들)
        // Find direct children (members whose parentId is current member)
        const children = allUsers.filter(u => u.parentId === user.id);

        // 하위 회원들의 입력 합계 계산
        // Calculate sum of children's inputs
        const childrenSum = { casino: 0, slot: 0, losing: 0 };
        children.forEach(child => {
            const childInput = inputMap.get(child.id!) || { casino: 0, slot: 0, losing: 0 };
            childrenSum.casino += childInput.casino;
            childrenSum.slot += childInput.slot;
            childrenSum.losing += childInput.losing;
        });

        // NET 계산: 본인 입력 - 하위 합계
        // Calculate NET: Own input - Children's sum
        const netAmounts = {
            casino: input.amounts.casino - childrenSum.casino,
            slot: input.amounts.slot - childrenSum.slot,
            losing: input.amounts.losing - childrenSum.losing
        };

        // NET이 0이 아닌 경우에만 처리 대상에 추가
        // Only add to processing list if NET is not zero
        if (netAmounts.casino !== 0 || netAmounts.slot !== 0 || netAmounts.losing !== 0) {
            netInputs.push({
                performerId: user.id!,
                amounts: netAmounts
            });
        }
    }

    // ===================================================================
    // 결과 추가 헬퍼 함수
    // Helper function to add results
    // 
    // 같은 회원의 같은 source(casino/slot/losing)에 대한 결과가
    // 여러 번 추가될 수 있으므로, 기존 값에 누적합니다.
    // ===================================================================
    const addToResult = (
        userId: number,
        userName: string,
        amount: number,
        role: 'self' | 'upper',
        source: 'casino' | 'slot' | 'losing',
        breakdown: string
    ) => {
        const key = `${userId}-${source}`;  // 고유 키 생성
        const existing = resultsMap.get(key);

        if (existing) {
            // 이미 있으면 금액 누적 및 breakdown 추가
            // If exists, accumulate amount and add breakdown
            existing.amount += amount;
            existing.breakdown = (existing.breakdown || '') + '\n' + breakdown;
        } else {
            // 없으면 새로 생성
            // If not exists, create new
            resultsMap.set(key, {
                userId,
                userName,
                amount,
                role,
                source,
                breakdown
            });
        }
    };

    // ===================================================================
    // 3단계: 각 NET 입력에 대해 수수료 계산
    // Step 3: Calculate commission for each NET input
    // ===================================================================
    for (const input of netInputs) {
        // 모두 0이면 건너뛰기 (최적화)
        // Skip if all zero (optimization)
        if (input.amounts.casino === 0 && input.amounts.slot === 0 && input.amounts.losing === 0) continue;

        // 실적을 발생시킨 회원 찾기
        // Find the member who generated the performance
        const performer = allUsers.find((u: User) => u.id === input.performerId);
        if (!performer) continue;

        // ===============================================================
        // 루징 베이스 계산 (Losing Base Calculation)
        // 
        // 루징 베이스 = 루징 금액 - (카지노 수수료 + 슬롯 수수료)
        // 
        // 중요: 여기서 "본인의" 수수료율을 사용합니다!
        // Important: Use "own" commission rates here!
        // ===============================================================
        const casinoExpense = input.amounts.casino * (Number(performer.casinoRate) / 100);
        const slotExpense = input.amounts.slot * (Number(performer.slotRate) / 100);
        const adjustedLosingAmount = input.amounts.losing - (casinoExpense + slotExpense);

        // ===============================================================
        // 각 타입(casino, slot, losing)에 대해 수수료 계산
        // Calculate commission for each type (casino, slot, losing)
        // ===============================================================
        (['casino', 'slot', 'losing'] as const).forEach(type => {
            // 해당 타입의 금액 결정
            // Determine amount for this type
            let amount = 0;
            if (type === 'casino') amount = input.amounts.casino;
            else if (type === 'slot') amount = input.amounts.slot;
            else if (type === 'losing') amount = adjustedLosingAmount;  // 조정된 루징 사용

            // 금액이 0이면 건너뛰기
            if (amount === 0) return;

            // 해당 타입의 수수료율 키 결정
            // Determine rate key for this type
            let rateKey: keyof User;
            if (type === 'casino') rateKey = 'casinoRate';
            else if (type === 'slot') rateKey = 'slotRate';
            else rateKey = 'losingRate';

            // ===========================================================
            // A. 본인 수수료 계산 (Own Commission)
            // ===========================================================
            const performerRate = Number(performer[rateKey]);
            const performerComm = amount * (performerRate / 100);

            // 계산 과정 문자열 생성 (상세 보기용)
            // Build breakdown string (for detail view)
            let selfBreakdown = '';
            if (type === 'losing') {
                selfBreakdown = `[${performer.name} 본인] Losing 베이스 = ${input.amounts.losing.toLocaleString()} - (Casino비용 ${casinoExpense.toLocaleString()} + Slot비용 ${slotExpense.toLocaleString()}) = ${amount.toLocaleString()}
→ ${amount.toLocaleString()} × ${performerRate}% = ${performerComm.toLocaleString()}`;
            } else {
                selfBreakdown = `[${performer.name} 본인] NET ${type} = ${amount.toLocaleString()} × ${performerRate}% = ${performerComm.toLocaleString()}`;
            }
            addToResult(performer.id!, performer.name, performerComm, 'self', type, selfBreakdown);

            // ===========================================================
            // B. 상위 차등 수수료 계산 (Upline Differential Commission)
            // 
            // 상위로 올라가면서 (상위 수수료율 - 하위 수수료율) 차이만큼 지급
            // Going up the hierarchy, pay the difference (parent rate - child rate)
            // ===========================================================
            let currentChildRate = performerRate;  // 현재 하위의 수수료율
            let currentParentId = performer.parentId;  // 상위 회원 ID

            while (currentParentId) {
                // 상위 회원 찾기
                const parent = allUsers.find(u => u.id === currentParentId);
                if (!parent) break;

                const parentRate = Number(parent[rateKey]);

                // 수수료율 차이 계산 (부동소수점 오차 방지)
                // Calculate rate difference (prevent floating point errors)
                const rawDiff = parentRate - currentChildRate;
                const diffRate = Math.round(rawDiff * 10000) / 10000;

                // 상위 수수료율이 더 높을 때만 차등 수수료 지급
                // Only pay differential if parent rate is higher
                if (diffRate > 0) {
                    const parentComm = amount * (diffRate / 100);
                    const upperBreakdown = `[${parent.name} 차등] ${performer.name}의 NET ${type} ${amount.toLocaleString()} × (${parentRate}% - ${currentChildRate}%) = ${amount.toLocaleString()} × ${diffRate}% = ${parentComm.toLocaleString()}`;
                    addToResult(parent.id!, parent.name, parentComm, 'upper', type, upperBreakdown);
                    currentChildRate = parentRate;  // 다음 차등 계산을 위해 업데이트
                } else {
                    // 수수료가 없어도, 상위가 더 높으면 업데이트 (더 높은 상위 차단용)
                    if (parentRate > currentChildRate) {
                        currentChildRate = parentRate;
                    }
                }

                // 다음 상위로 이동
                // Move to next parent
                currentParentId = parent.parentId;
            }
        });
    }

    // ===================================================================
    // 4단계: 결과 반환 (금액 내림차순 정렬)
    // Step 4: Return results (sorted by amount descending)
    // ===================================================================
    return Array.from(resultsMap.values()).sort((a, b) => b.amount - a.amount);
}

