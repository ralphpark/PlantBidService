// 준비 중인 주문 목록에 onClick 이벤트 추가
// 라인 2443-2446 수정
<div 
  key={order.id}
  className={`p-4 cursor-pointer hover:bg-muted/50`}
  onClick={() => {
    // 준비 중인 주문도 주문 상세 정보만 표시
    setSelectedRealOrder(order);
    setShowOrderChat(true);
    // 입찰 관련 모달은 열지 않음
    setSelectedOrder(null);
  }}
>