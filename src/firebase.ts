/**
 * firebase.ts - Firebase 설정 파일 (Firebase Configuration File)
 * 
 * Firebase란? 구글이 제공하는 "Backend-as-a-Service" 플랫폼입니다.
 * What is Firebase? A "Backend-as-a-Service" platform provided by Google.
 * 
 * 쉽게 말해, 서버를 직접 만들지 않아도 로그인, 데이터베이스, 호스팅 등을 사용할 수 있게 해줍니다.
 * Simply put, it lets you use login, database, hosting, etc. without building your own server.
 * 
 * 이 앱에서 사용하는 Firebase 서비스:
 * Firebase services used in this app:
 * 1. Authentication - 로그인/회원가입 (Login/Sign-up)
 * 2. Firestore - 클라우드 데이터베이스 (Cloud Database)
 */

// Firebase 핵심 함수들 가져오기
// Import core Firebase functions
import { initializeApp } from "firebase/app";    // 앱 초기화
import { getAuth } from "firebase/auth";          // 인증 서비스
import { getFirestore } from "firebase/firestore"; // 데이터베이스 서비스

/**
 * Firebase 설정 객체 (Firebase Configuration Object)
 * 
 * 이 값들은 Firebase 콘솔에서 프로젝트를 만들면 자동으로 제공됩니다.
 * These values are automatically provided when you create a project in Firebase Console.
 * 
 * 각 키의 의미 (Meaning of each key):
 * - apiKey: API 호출에 사용되는 키 (Key used for API calls)
 * - authDomain: 로그인 팝업에 사용되는 도메인 (Domain used for login popups)
 * - projectId: 프로젝트 고유 ID (Unique project ID)
 * - storageBucket: 파일 저장소 주소 (File storage address)
 * - messagingSenderId: 푸시 알림용 ID (ID for push notifications)
 * - appId: 앱 고유 ID (Unique app ID)
 * - measurementId: Google Analytics용 ID (ID for Google Analytics)
 * 
 * ⚠️ 보안 참고 (Security Note):
 * 이 키들은 클라이언트에 노출되어도 괜찮습니다.
 * These keys are safe to expose on the client side.
 * 실제 보안은 Firebase Security Rules에서 처리합니다.
 * Real security is handled by Firebase Security Rules.
 */
const firebaseConfig = {
    apiKey: "AIzaSyCQ_czv1Zjl77Sb-MhWt_aKo3UrwoCM_94",
    authDomain: "commissioncalculator-46c7e.firebaseapp.com",
    projectId: "commissioncalculator-46c7e",
    storageBucket: "commissioncalculator-46c7e.firebasestorage.app",
    messagingSenderId: "615774860880",
    appId: "1:615774860880:web:7afc8b0353864b7072c355",
    measurementId: "G-8FHM9GGN48"
};

// Firebase 앱 초기화 - 모든 Firebase 서비스를 사용하기 전에 필수!
// Initialize Firebase app - required before using any Firebase service!
const app = initializeApp(firebaseConfig);

// 인증(Authentication) 서비스 인스턴스 생성 및 내보내기
// Create and export Authentication service instance
// 다른 파일에서 사용: import { auth } from './firebase'
// Usage in other files: import { auth } from './firebase'
export const auth = getAuth(app);

// Firestore 데이터베이스 인스턴스 생성 및 내보내기
// Create and export Firestore database instance
// 다른 파일에서 사용: import { db } from './firebase'
// Usage in other files: import { db } from './firebase'
export const db = getFirestore(app);

