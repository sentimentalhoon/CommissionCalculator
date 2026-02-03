/**
 * main.tsx - 애플리케이션의 시작점 (Entry Point of the Application)
 * 
 * 이 파일은 React 앱이 처음 시작되는 곳입니다.
 * This is where the React app first starts running.
 * 
 * React 앱은 HTML의 특정 요소(root)에 "렌더링"(화면에 그리기)됩니다.
 * React app is "rendered" (drawn on screen) into a specific HTML element (root).
 */

// React의 StrictMode를 가져옵니다 - 개발 중 잠재적 문제를 찾아줍니다
// Import StrictMode from React - helps find potential problems during development
import { StrictMode } from 'react'

// createRoot는 React 18+의 새로운 렌더링 방식입니다
// createRoot is the new rendering method in React 18+
import { createRoot } from 'react-dom/client'

// 전역 CSS 스타일을 가져옵니다 (TailwindCSS 포함)
// Import global CSS styles (including TailwindCSS)
import './index.css'

// 메인 App 컴포넌트를 가져옵니다 - 이것이 우리 앱의 "최상위" 컴포넌트입니다
// Import the main App component - this is the "top-level" component of our app
import App from './App.tsx'

/**
 * 앱 렌더링 (Render the App)
 * 
 * 1. document.getElementById('root') - HTML에서 id="root"인 요소를 찾습니다
 *    Find the element with id="root" in HTML
 * 
 * 2. createRoot(...) - 그 요소를 React의 "루트"로 만듭니다
 *    Make that element a React "root"
 * 
 * 3. .render(...) - 그 안에 우리 앱을 그립니다
 *    Draw our app inside it
 * 
 * 4. StrictMode - 개발 모드에서 추가 검사를 활성화합니다 (프로덕션에서는 영향 없음)
 *    Enables extra checks in development mode (no effect in production)
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

