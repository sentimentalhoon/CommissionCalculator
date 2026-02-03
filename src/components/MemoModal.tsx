import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Palette, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (memo: string, color: string) => void;
    initialMemo?: string;
    initialColor?: string;
    userName: string;
}

const COLORS = [
    { id: 'yellow', name: '노랑', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-400' },
    { id: 'blue', name: '파랑', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-400' },
    { id: 'green', name: '초록', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-400' },
    { id: 'rose', name: '장미', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', dot: 'bg-rose-400' },
    { id: 'purple', name: '보라', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-400' },
];

export default function MemoModal({
    isOpen,
    onClose,
    onSave,
    initialMemo = '',
    initialColor = 'yellow',
    userName
}: MemoModalProps) {
    const [memo, setMemo] = useState(initialMemo);
    const [selectedColor, setSelectedColor] = useState(initialColor);

    useEffect(() => {
        if (isOpen) {
            setMemo(initialMemo);
            setSelectedColor(initialColor);
        }
    }, [isOpen, initialMemo, initialColor]);

    const activeColor = COLORS.find(c => c.id === selectedColor) || COLORS[0];

    const handleSave = () => {
        onSave(memo, selectedColor);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-[70] pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-md pointer-events-auto"
                        >
                            <div className={clsx(
                                "relative rounded-3xl shadow-2xl overflow-hidden border-2 transition-colors duration-500",
                                activeColor.bg,
                                activeColor.border
                            )}>
                                {/* Decorative "Peel" Effect corner */}
                                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                                    <div className={clsx(
                                        "absolute top-[-32px] right-[-32px] w-16 h-16 rotate-45 border-b-2 border-l-2 shadow-sm",
                                        activeColor.border,
                                        "bg-white/30"
                                    )} />
                                </div>

                                {/* Header */}
                                <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-2 h-2 rounded-full", activeColor.dot)} />
                                            <h3 className="text-lg font-black text-slate-800">
                                                {userName} 메모
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock size={12} />
                                            {format(new Date(), 'yyyy. MM. dd (EEEE)', { locale: ko })}
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-black/5 rounded-full text-slate-400 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6">
                                    <textarea
                                        value={memo}
                                        onChange={(e) => setMemo(e.target.value)}
                                        placeholder="이곳에 메모를 작성하세요..."
                                        className={clsx(
                                            "w-full h-48 bg-transparent border-none focus:ring-0 resize-none",
                                            "text-slate-800 font-medium leading-relaxed placeholder:text-slate-300 md:text-lg",
                                            "custom-scrollbar"
                                        )}
                                        autoFocus
                                    />
                                </div>

                                {/* Footer Tools */}
                                <div className="px-6 py-4 bg-white/50 backdrop-blur-md border-t border-black/5 flex flex-col gap-4">
                                    {/* Color Picker */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                                            <Palette size={14} /> Note Color
                                        </div>
                                        <div className="flex gap-2">
                                            {COLORS.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setSelectedColor(c.id)}
                                                    className={clsx(
                                                        "w-6 h-6 rounded-full border-2 transition-all active:scale-90",
                                                        c.id === selectedColor ? "border-slate-800 scale-110 shadow-md" : "border-transparent",
                                                        c.dot
                                                    )}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={handleSave}
                                        className={clsx(
                                            "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-[0.98]",
                                            "flex items-center justify-center gap-2 group",
                                            selectedColor === 'yellow' ? 'bg-amber-500 shadow-amber-500/20' :
                                                selectedColor === 'blue' ? 'bg-blue-500 shadow-blue-500/20' :
                                                    selectedColor === 'green' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                                        selectedColor === 'rose' ? 'bg-rose-500 shadow-rose-500/20' :
                                                            'bg-purple-500 shadow-purple-500/20'
                                        )}
                                    >
                                        <Save size={20} className="group-hover:rotate-12 transition-transform" />
                                        저장하기
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
