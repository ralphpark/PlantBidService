// AI 추천 대화 관련 유틸리티 함수

/**
 * 새로운 AI 추천 대화를 시작합니다.
 * 서버에 요청을 보내고 초기 대화 정보를 반환합니다.
 * 
 * @param userId 사용자 ID
 * @param initialMessage 초기 메시지 (기본값: "AI 추천으로 진행할게요.")
 * @returns 생성된 대화 정보
 */
export async function startNewAIConversation(userId: number, initialMessage: string = "AI 추천으로 진행할게요.") {
  console.log("AI 추천 대화 시작 요청 전송");
  
  try {
    const response = await fetch("/api/conversations/new-ai-conversation", {
      method: "POST",
      credentials: "include", // 중요: 인증 쿠키 포함
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: userId,
        initialMessage: initialMessage
      })
    });
    
    // 응답 상태 로깅
    console.log("서버 응답 상태:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("서버 오류 응답:", errorText);
      throw new Error(`대화 시작 실패 (${response.status}): ${errorText}`);
    }
    
    console.log("응답 데이터 파싱 시작");
    const data = await response.json();
    console.log("서버 응답 데이터:", data);
    
    return data;
  } catch (error) {
    console.error("AI 대화 시작 중 오류 발생:", error);
    throw error;
  }
}