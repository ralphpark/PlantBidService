/**
 * 대화 내역 발신자 표시 문제 수정을 위한 임시 코드
 * 
 * 문제 설명:
 * - BidDetailsSidePanel.tsx에서 ConversationViewReadOnly 컴포넌트 사용 시 
 *   모든 메시지가 "판매자 메시지"로 표시되는 문제 발생
 * 
 * 해결 방법:
 * 1. ConversationViewReadOnly 컴포넌트에서 하드코딩된 발신자 레이블을 
 *    각 메시지의 role 속성에 따라 다르게 표시하도록 수정
 * 2. 대략 3곳의 코드에서 발신자 레이블 로직 수정 필요:
 *    - 일반 메시지 표시 (약 463-466줄)
 *    - 제품 정보 포함 메시지 (약 343줄)
 *    - 메시지 내용 표시 부분 (약 392-399줄)
 * 
 * 구현 방법:
 * - 모든 메시지 표시에서 동일한 로직 적용:
 *   if (msg.role === 'user') -> 고객 메시지
 *   else if (msg.role === 'assistant') -> AI 상담사 메시지
 *   else -> 판매자 메시지
 */

// ConversationViewReadOnly.tsx에서 발신자 표시 로직 수정 예시
function getSenderLabel(msg) {
  if (msg.role === 'user') {
    return '고객 메시지:';
  } else if (msg.role === 'assistant') {
    return 'AI 상담사 메시지:';
  } else if (msg.role === 'vendor') {
    return (msg.vendorName || msg.storeName || '판매자') + ' 메시지:';
  } else {
    return '메시지:';
  }
}