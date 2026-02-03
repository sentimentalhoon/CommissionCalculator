import { ChevronDown } from 'lucide-react';
import type { User } from '../../db';

interface MasterSelectorProps {
    grandMasters: User[];
    selectedMasterId: string | null;
    onSelect: (id: string) => void;
}

export function MasterSelector({ grandMasters, selectedMasterId, onSelect }: MasterSelectorProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">
                정산할 대마스터 선택
            </label>
            <div className="relative">
                <select
                    value={selectedMasterId || ''}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                >
                    <option value="">선택해주세요</option>
                    {grandMasters.map(gm => (
                        <option key={gm.id} value={gm.id}>
                            {gm.name} ({gm.level})
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
            </div>
        </div>
    );
}
