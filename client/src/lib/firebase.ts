import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase 설정
// 실제 프로덕션용 Firebase 설정으로 하드코딩
const firebaseConfig = {
  apiKey: "AIzaSyCqWzr9TTxdNV5DQKlXkLXkfM0pUKr_A-0",
  authDomain: "plantbid-9911d.firebaseapp.com",
  projectId: "plantbid-9911d",
  storageBucket: "plantbid-9911d.firebasestorage.app",
  messagingSenderId: "1098113919937",
  appId: "1:1098113919937:web:f26e1eada2f1d7fe5db27c",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 서비스 가져오기
export const auth = getAuth(app);

// 기본 export
export default app;