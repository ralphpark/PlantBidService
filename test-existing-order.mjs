import { default as axios } from 'axios';

async function testExistingOrders() {
  try {
    console.log('💾 데이터베이스에 존재하는 주문 조회');
    // 주문 정보 조회 API 호출
    const listResponse = await axios.get('http://localhost:5000/api/orders', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 주문 목록 조회 응답:', listResponse.status);
    
    if (!listResponse.data || !Array.isArray(listResponse.data) || listResponse.data.length === 0) {
      console.log('⚠️ 주문 정보가 없습니다. 테스트용 주문/결제 정보를 생성해야 합니다.');
      return;
    }
    
    // 가장 최근 주문 선택
    const latestOrder = listResponse.data[0];
    console.log(`✅ 테스트할 주문 정보: ID=${latestOrder.id}, 주문 ID=${latestOrder.orderId}, 상태=${latestOrder.status}`);
    
    // 선택한 주문으로 결제 취소 테스트
    if (latestOrder.orderId) {
      console.log(`\n📌 실제 주문으로 결제 취소 테스트 시작: ${latestOrder.orderId}`);
      
      const cancelResponse = await axios.post('http://localhost:5000/direct/payments/cancel', {
        orderId: latestOrder.orderId,
        reason: '테스트 취소 요청'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ 응답 상태 코드:', cancelResponse.status);
      console.log('✅ 응답 헤더:', JSON.stringify(cancelResponse.headers, null, 2));
      console.log('✅ 응답 데이터:', JSON.stringify(cancelResponse.data, null, 2));
    } else {
      console.log('⚠️ 선택한 주문에 orderId가 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// 테스트 실행
testExistingOrders();
