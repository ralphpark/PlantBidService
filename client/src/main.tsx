import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AnimatePresence } from "framer-motion";

// 포트원으로 결제 시스템 변경됨 (토스페이먼츠 SDK를 더 이상 사용하지 않음)
// 직접 로드하는 방식에서 index.html에 포함된 스크립트 사용으로 변경

// 전역 타입 선언 추가
declare global {
  interface Window {
    // PortOne 타입 (포트원 SDK)
    PortOne: any;
    // 레거시 타입 (기존 코드와의 호환성)
    PaymentWidget?: any;
    tossPaymentsScriptLoaded?: boolean;
    TossPayments?: any;
    TossPaymentsReady?: boolean;
  }
}

createRoot(document.getElementById("root")!).render(
  <AnimatePresence>
    <App />
  </AnimatePresence>
);
