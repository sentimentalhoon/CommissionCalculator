/**
 * App.tsx - 애플리케이션의 메인 컴포넌트 (Main Application Component)
 * 
 * 이 파일은 앱의 "라우팅"(페이지 이동)과 "인증"(로그인 확인)을 설정합니다.
 * This file sets up the app's "routing" (page navigation) and "authentication" (login verification).
 * 
 * 라우팅이란? URL에 따라 다른 페이지를 보여주는 것입니다.
 * What is routing? Showing different pages based on the URL.
 * 예: /users → 회원 관리 페이지, /calculator → 정산 페이지
 */

// React Router - URL에 따라 다른 컴포넌트를 보여주는 라이브러리
// React Router - library that shows different components based on URL
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 페이지 컴포넌트들 가져오기 (Import page components)
import Layout from './components/Layout';        // 전체 레이아웃 (헤더, 네비게이션)
import Dashboard from './pages/Dashboard';      // 대시보드 (홈 화면)
import UsersPage from './pages/UsersPage';      // 회원 관리 페이지
import CalculatorPage from './pages/CalculatorPage';  // 정산 계산기 페이지
import LoginPage from './pages/LoginPage';      // 로그인 페이지

// 인증 관련 (Authentication related)
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';

/**
 * RequireAuth - 로그인 필수 확인 컴포넌트 (Login Required Check Component)
 * 
 * 이 컴포넌트는 "보호된 경로"를 만듭니다.
 * This component creates "protected routes".
 * 
 * 작동 방식 (How it works):
 * 1. 로그인 했으면 → children(자식 컴포넌트)을 보여줌
 *    If logged in → show children component
 * 2. 로그인 안 했으면 → 로그인 페이지로 이동
 *    If not logged in → redirect to login page
 * 
 * @param children - 보호할 컴포넌트 (Component to protect)
 */
function RequireAuth({ children }: { children: React.ReactElement }) {
  // useAuth() - 현재 로그인 상태를 가져옵니다
  // useAuth() - gets the current login status
  const { currentUser } = useAuth()!;

  // useLocation() - 현재 URL 정보를 가져옵니다 (나중에 돌아오기 위해 저장)
  // useLocation() - gets current URL info (saved for returning later)
  const location = useLocation();

  // 로그인하지 않은 경우 → 로그인 페이지로 리다이렉트
  // If not logged in → redirect to login page
  if (!currentUser) {
    // Navigate 컴포넌트로 페이지 이동
    // state={{ from: location }} - 로그인 후 원래 페이지로 돌아오기 위해 현재 위치 저장
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 로그인한 경우 → 자식 컴포넌트를 그대로 보여줌
  // If logged in → show children as they are
  return children;
}

/**
 * App - 메인 앱 컴포넌트 (Main App Component)
 * 
 * 앱의 구조 (App Structure):
 * 
 * AuthProvider (인증 상태 관리)
 *   └── BrowserRouter (URL 라우팅)
 *         └── Routes (라우트 정의)
 *               ├── /login → LoginPage (로그인 페이지) - 누구나 접근 가능
 *               └── / → RequireAuth로 보호된 영역 (로그인 필요)
 *                     └── Layout (전체 레이아웃)
 *                           ├── / (index) → Dashboard
 *                           ├── /users → UsersPage
 *                           └── /calculator → CalculatorPage
 */
function App() {
  return (
    // AuthProvider - 앱 전체에 인증 상태를 제공합니다
    // AuthProvider - provides authentication state to the entire app
    <AuthProvider>
      {/* BrowserRouter - URL 기반 라우팅을 활성화합니다 */}
      {/* BrowserRouter - enables URL-based routing */}
      <BrowserRouter>
        {/* Routes - 여러 Route를 그룹화합니다 */}
        {/* Routes - groups multiple Route components */}
        <Routes>
          {/* 로그인 페이지 - 보호되지 않음 (누구나 접근 가능) */}
          {/* Login page - not protected (anyone can access) */}
          <Route path="/login" element={<LoginPage />} />

          {/* 메인 레이아웃 - RequireAuth로 보호됨 (로그인 필요) */}
          {/* Main layout - protected by RequireAuth (login required) */}
          <Route path="/" element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            {/* 중첩 라우트 (Nested Routes) - Layout 안에서 렌더링됨 */}
            {/* index - 기본 경로 "/" 일 때 보여줄 컴포넌트 */}
            <Route index element={<Dashboard />} />
            {/* /users 경로 */}
            <Route path="users" element={<UsersPage />} />
            {/* /calculator 경로 */}
            <Route path="calculator" element={<CalculatorPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// default export - 이 컴포넌트를 다른 파일에서 import할 수 있게 합니다
// default export - allows this component to be imported from other files
export default App

