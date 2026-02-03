import { RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

interface ActionButtonsProps {
    onCalculate: () => void;
    onReset: () => void;
    isCalculating: boolean;
}

export function ActionButtons({ onCalculate, onReset, isCalculating }: ActionButtonsProps) {
    return (
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button
                onClick={onReset}
                className="flex-1 bg-white text-slate-600 font-bold py-4 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <RotateCcw size={20} />
                초기화
            </button>
            <button
                onClick={onCalculate}
                disabled={isCalculating}
                className={clsx(
                    "flex-[2] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]",
                    isCalculating ? "bg-slate-700 cursor-wait opacity-80" : "bg-slate-900 shadow-slate-900/20"
                )}
            >
                {isCalculating ? '계산 중...' : '정산 결과 계산하기'}
            </button>
        </div>
    );
}
