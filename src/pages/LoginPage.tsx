import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('이메일 또는 비밀번호가 일치하지 않습니다.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
            } else {
                setError('로그인에 실패했습니다: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="bg-slate-900 p-8 text-center text-white">
                    <div className="inline-flex p-4 bg-slate-800 rounded-2xl mb-4 shadow-inner">
                        <Lock size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Commission Manager</h1>
                    <p className="text-slate-400 text-sm">시스템에 접속하려면 로그인이 필요합니다.</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm font-medium animate-in slide-in-from-top-2">
                            <AlertCircle className="shrink-0 mt-0.5" size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-semibold"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-semibold"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 mt-4",
                                loading
                                    ? "bg-slate-400 cursor-not-allowed"
                                    : "bg-slate-900 hover:bg-slate-800 active:scale-[0.98] shadow-slate-900/20"
                            )}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    로그인
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
