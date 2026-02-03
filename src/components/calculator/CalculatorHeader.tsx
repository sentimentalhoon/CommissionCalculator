import { Calculator as CalcIcon } from 'lucide-react';

export function CalculatorHeader() {
    return (
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-slate-900 rounded-2xl shadow-lg shadow-slate-900/20">
                <CalcIcon className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    수수료 정산
                </h1>
                <p className="text-slate-500 font-medium">
                    하부 회원의 수수료를 입력하여 상위 수익을 정산합니다.
                </p>
            </div>
        </div>
    );
}
