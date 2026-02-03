/**
 * Layout.tsx - 앱 전체 레이아웃 컴포넌트 (App Layout Component)
 * 
 * 이 컴포넌트는 앱의 "껍데기"를 정의합니다:
 * This component defines the app's "shell":
 * 
 * ┌─────────────────────────┐
 * │  Header (헤더/제목)      │
 * ├─────────────────────────┤
 * │                         │
 * │  Main Content (내용)    │  ← Outlet: 여기에 각 페이지가 렌더링됨
 * │                         │
 * ├─────────────────────────┤
 * │  Bottom Nav (하단 탭)    │
 * └─────────────────────────┘
 * 
 * React Router의 <Outlet>이란?
 * What is React Router's <Outlet>?
 * 
 * 중첩 라우트에서 자식 라우트가 렌더링되는 위치를 지정합니다.
 * In nested routes, it specifies where child routes are rendered.
 */

// React Router 관련 (React Router related)
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

// 아이콘 라이브러리 (lucide-react)
// Icon library (lucide-react)
import { Home, Users, Calculator, LogOut } from 'lucide-react';

// clsx: 조건부 CSS 클래스를 쉽게 조합하는 유틸리티
// clsx: utility for easily combining conditional CSS classes
import clsx from 'clsx';

// 인증 컨텍스트 - 로그아웃 함수 사용 (Auth context - for logout function)
import { useAuth } from '../contexts/AuthContext';

/**
 * Layout 컴포넌트 - 메인 레이아웃
 * Layout Component - main layout
 */
export default function Layout() {
    // useLocation: 현재 URL 정보를 가져옵니다 (어떤 탭이 활성화인지 확인용)
    // useLocation: gets current URL info (to check which tab is active)
    const location = useLocation();

    // useNavigate: 프로그래밍 방식으로 페이지 이동 (for programmatic navigation)
    const navigate = useNavigate();

    // useAuth: 인증 컨텍스트에서 logout 함수 가져오기 (get logout from auth context)
    const { logout } = useAuth()!;

    // 로그아웃 핸들러 (Logout handler)
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
        } catch (error) {
            console.error('로그아웃 실패:', error);
        }
    };

    // 네비게이션 아이템 정의 (하단 탭 메뉴)
    // Navigation items definition (bottom tab menu)
    const navItems = [
        { path: '/', label: '홈', icon: Home },           // 대시보드
        { path: '/users', label: '회원관리', icon: Users }, // 회원 관리
        { path: '/calculator', label: '정산', icon: Calculator }, // 정산 계산기
    ];

    return (
        // 전체 화면 컨테이너 - 가운데 정렬
        // Full screen container - center aligned
        <div className="flex flex-col h-screen bg-slate-100 items-center justify-center">
            {/* 앱 컨테이너 - 최대 800px 너비로 제한 (모바일 앱 느낌) */}
            {/* App container - limited to max 800px width (mobile app feel) */}
            <div className="w-full h-full max-w-[800px] bg-slate-50 text-slate-900 flex flex-col shadow-2xl relative">

                {/* ===== 헤더 영역 (Header Area) ===== */}
                <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 safe-area-top flex justify-between items-center">
                    {/* 앱 제목 - 그라데이션 텍스트 효과 */}
                    {/* App title - gradient text effect */}
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                        수수료 정산 시스템
                    </h1>

                    {/* 로그아웃 버튼 (Logout button) */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="로그아웃"
                    >
                        <LogOut size={20} />
                    </button>
                </header>

                {/* ===== 메인 콘텐츠 영역 (Main Content Area) ===== */}
                {/* Outlet: 현재 라우트에 해당하는 페이지 컴포넌트가 여기에 렌더링됨 */}
                {/* Outlet: page component for current route renders here */}
                <main className="flex-1 overflow-y-auto p-4 safe-area-bottom pb-20 scrollbar-hide">
                    <Outlet />
                </main>

                {/* ===== 하단 네비게이션 (Bottom Navigation) ===== */}
                <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-20">
                    <div className="flex justify-around items-center h-16">
                        {/* 각 탭 아이템을 반복 렌더링 (map) */}
                        {/* Render each tab item with map */}
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // 현재 경로와 일치하면 활성화 상태
                            // Active state if matches current path
                            const isActive = location.pathname === item.path;

                            return (
                                // Link: 페이지 새로고침 없이 이동 (SPA 방식)
                                // Link: navigate without page refresh (SPA style)
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={clsx(
                                        "flex flex-col items-center justify-center w-full h-full transition-colors active:scale-95",
                                        // 활성화 상태에 따라 다른 스타일 적용
                                        // Apply different styles based on active state
                                        isActive ? "text-primary-600" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {/* 아이콘 - 활성화 시 더 굵게 */}
                                    {/* Icon - bolder when active */}
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                    {/* 탭 라벨 */}
                                    {/* Tab label */}
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

