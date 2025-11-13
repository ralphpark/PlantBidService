import React from 'react';

// 메시지 발신자 레이블을 일관되게 표시하기 위한 컴포넌트
export function MessageLabel({ 
  message 
}: { 
  message: any 
}) {
  // 메시지 역할에 따라 적절한 레이블 생성
  if (message.role === 'user') {
    return <span>고객 메시지:</span>;
  } else if (message.role === 'assistant') {
    return <span>AI 상담사 메시지:</span>;
  } else if (message.role === 'vendor') {
    return <span>{message.vendorName || message.storeName || '판매자'} 메시지:</span>;
  } else {
    return <span>메시지:</span>;
  }
}