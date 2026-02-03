/**
 * AuthContext.tsx - 인증 컨텍스트 (Authentication Context)
 * 
 * 이 파일은 앱 전체에서 "로그인 상태"를 공유하는 방법을 제공합니다.
 * This file provides a way to share "login state" across the entire app.
 * 
 * React Context란?
 * What is React Context?
 * 
 * 일반적으로 React에서 데이터를 전달하려면 부모 → 자식으로 props를 넘겨야 합니다.
 * Normally in React, to pass data you need to pass props from parent → child.
 * 
 * 하지만 "로그인 상태"처럼 많은 컴포넌트에서 필요한 데이터는 
 * props로 계속 전달하기 번거롭습니다 ("prop drilling" 문제).
 * 
 * But for data needed by many components like "login state",
 * it's cumbersome to keep passing props ("prop drilling" problem).
 * 
 * Context는 이런 문제를 해결합니다 - 데이터를 "전역적으로" 공유할 수 있습니다.
 * Context solves this - you can share data "globally".
 */

// React 훅들 가져오기 (Import React hooks)
import { createContext, useContext, useEffect, useState } from 'react';

// Firebase 인증 관련 함수들 (Firebase Auth functions)
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth'; // Firebase User 타입

// Firebase 인스턴스 (Firebase instance)
import { auth } from '../firebase';

/**
 * AuthContextType 인터페이스 - Context에서 제공하는 데이터의 형태
 * AuthContextType Interface - shape of data provided by Context
 */
interface AuthContextType {
    // 현재 로그인한 사용자 (Firebase User 객체 또는 null)
    // Currently logged in user (Firebase User object or null)
    currentUser: User | null;

    // 로딩 중인지 여부 (초기 인증 상태 확인 중)
    // Whether loading (checking initial auth state)
    loading: boolean;

    // 로그아웃 함수
    // Logout function
    logout: () => Promise<void>;

    // 관리자 여부 (현재는 이메일로 간단히 판별)
    // Whether admin (currently simple email check)
    isAdmin: boolean;
}

/**
 * AuthContext 생성
 * Create AuthContext
 * 
 * createContext<T>() - 타입 T의 데이터를 공유할 Context 생성
 * createContext<T>() - creates a Context that shares data of type T
 * 
 * 초기값은 null (Provider가 없으면 오류 방지)
 * Initial value is null (prevents errors if no Provider)
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * useAuth 훅 - Context 데이터를 쉽게 사용하기 위한 커스텀 훅
 * useAuth Hook - custom hook for easily using Context data
 * 
 * 사용 예시 (Usage example):
 * const { currentUser, isAdmin, logout } = useAuth();
 */
export function useAuth() {
    return useContext(AuthContext);
}

/**
 * AuthProvider 컴포넌트 - 인증 상태를 제공하는 컴포넌트
 * AuthProvider Component - component that provides auth state
 * 
 * 이 컴포넌트로 앱을 감싸면, 그 안의 모든 컴포넌트에서
 * useAuth()로 인증 정보에 접근할 수 있습니다.
 * 
 * When you wrap the app with this component, all components inside
 * can access auth information using useAuth().
 * 
 * @param children - 감싸질 자식 컴포넌트들
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    // ===== 상태 관리 (State Management) =====

    // 현재 로그인한 사용자 (처음엔 null)
    // Currently logged in user (initially null)
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // 초기 로딩 상태 (Firebase 인증 확인 중)
    // Initial loading state (checking Firebase auth)
    const [loading, setLoading] = useState(true);

    // ===== 관리자 이메일 설정 (Admin Email Setting) =====
    // 하드코딩된 관리자 이메일 (간단한 구현을 위해)
    // 실제 앱에서는 Firebase Custom Claims나 Firestore를 사용하세요
    // Hardcoded admin email (for simplicity)
    // In a real app, use Firebase Custom Claims or Firestore
    const ADMIN_EMAIL = "sentimentalhoon@gmail.com";

    // ===== 인증 상태 리스너 (Auth State Listener) =====
    /**
     * useEffect - 컴포넌트가 처음 마운트될 때 실행
     * useEffect - runs when component first mounts
     * 
     * onAuthStateChanged - Firebase의 인증 상태 변화를 감지하는 리스너
     * onAuthStateChanged - listener that detects Firebase auth state changes
     * 
     * 사용자가 로그인/로그아웃하면 자동으로 콜백이 호출됩니다.
     * Callback is automatically called when user logs in/out.
     */
    useEffect(() => {
        // Firebase 인증 상태 리스너 등록
        // Register Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);  // 사용자 상태 업데이트
            setLoading(false);     // 로딩 완료
        });

        // 클린업 함수 - 컴포넌트 언마운트 시 리스너 해제
        // Cleanup function - unsubscribe listener when component unmounts
        return unsubscribe;
    }, []); // 빈 배열 = 최초 1회만 실행 (Empty array = run only once)

    // ===== 로그아웃 함수 (Logout Function) =====
    const logout = () => {
        // Firebase signOut 호출 - Promise 반환
        // Call Firebase signOut - returns Promise
        return signOut(auth);
    };

    // ===== 관리자 여부 판별 (Admin Check) =====
    // 현재 사용자의 이메일이 관리자 이메일과 일치하는지 확인
    // Check if current user's email matches admin email
    const isAdmin = currentUser?.email === ADMIN_EMAIL;

    // ===== Context에 제공할 값 (Value to provide in Context) =====
    const value = {
        currentUser,  // 현재 사용자
        loading,      // 로딩 상태
        logout,       // 로그아웃 함수
        isAdmin       // 관리자 여부
    };

    // ===== Provider 렌더링 (Render Provider) =====
    return (
        // Context.Provider - 자식들에게 value를 제공
        // Context.Provider - provides value to children
        <AuthContext.Provider value={value}>
            {/* 로딩 중에는 아무것도 렌더링하지 않음 (깜빡임 방지) */}
            {/* Don't render anything while loading (prevents flicker) */}
            {!loading && children}
        </AuthContext.Provider>
    );
}

