import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Calculator } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: '홈', icon: Home },
        { path: '/users', label: '회원관리', icon: Users },
        { path: '/calculator', label: '정산', icon: Calculator },
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-100 items-center justify-center">
            <div className="w-full h-full max-w-[800px] bg-slate-50 text-slate-900 flex flex-col shadow-2xl relative">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 safe-area-top">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                        수수료 정산 시스템
                    </h1>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 safe-area-bottom pb-20 scrollbar-hide">
                    <Outlet />
                </main>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-20">
                    <div className="flex justify-around items-center h-16">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={clsx(
                                        "flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95",
                                        isActive ? "text-primary-600" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-xs mt-1 font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}
