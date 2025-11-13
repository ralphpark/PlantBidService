/**
 * 포트원 결제 취소 MID 테스트 스크립트
 * 이 스크립트는 결제 취소 API 호출 시 MID가 올바르게 전달되는지 테스트합니다.
 */

// 내장 모듈 사용
import { request } from 'http';
import { URL } from 'url';

// 고정 MID 값
const FIXED_MID = "MOI3204387";

// 테스트 설정
const TEST_CONFIG = {
  // 기본 API 엔드포인트
  apiHost: "localhost",
  apiPort: 5000,
  apiPath: "/API_TEST/payments/cancel",
  
  // 테스트용 랜덤 주문 ID 생성 (pay_ 형식)
  generateOrderId: () => {
    const prefix = "pay_";
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timestampPart = Date.now().toString(36);
    const paddedId = (timestampPart + randomPart).substring(0, 22).padEnd(22, 'f');
    return prefix + paddedId;
  }
};

/**
 * 결제 취소 테스트 함수
 */
async function testCancelWithMid() {
  console.log("===== 포트원 결제 취소 MID 테스트 =====");
  
  // 테스트용 주문 ID 생성
  const orderId = TEST_CONFIG.generateOrderId();
  console.log(`테스트 주문 ID: ${orderId}`);
  
  // 취소 요청 데이터
  const cancelData = {
    orderId: orderId,
    reason: "MID 테스트를 위한 취소 요청",
    merchantId: FIXED_MID
  };
  
  console.log(`요청 데이터:`, cancelData);
  
  try {
    // API 호출 (Node.js http 모듈 사용)
    const jsonData = JSON.stringify(cancelData);
    
    // HTTP 요청 옵션
    const options = {
      hostname: TEST_CONFIG.apiHost,
      port: TEST_CONFIG.apiPort,
      path: TEST_CONFIG.apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
      }
    };
    
    // 프로미스로 HTTP 요청 래핑
    const httpRequest = () => {
      return new Promise((resolve, reject) => {
        let responseData = '';
        let statusCode;
        
        const req = request(options, (res) => {
          statusCode = res.statusCode;
          
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            console.log(`\n응답 상태: ${statusCode}`);
            try {
              const parsedData = JSON.parse(responseData);
              resolve({
                status: statusCode,
                data: parsedData
              });
            } catch (error) {
              console.error('응답 데이터 파싱 오류:', error);
              reject(new Error('응답 데이터 파싱 오류'));
            }
          });
        });
        
        req.on('error', (error) => {
          console.error('요청 오류:', error);
          reject(error);
        });
        
        // 요청 본문 전송
        req.write(jsonData);
        req.end();
      });
    };
    
    // HTTP 요청 실행
    const response = await httpRequest();
    const responseData = response.data;
    
    console.log(`응답 데이터:`, responseData);
    
    // MID 검증
    if (response.status >= 200 && response.status < 300 && responseData.merchantId === FIXED_MID) {
      console.log(`✅ MID 검증 통과: 응답에 올바른 MID(${responseData.merchantId})가 포함되어 있습니다.`);
    } else if (response.status >= 200 && response.status < 300) {
      console.log(`❌ MID 검증 실패: 응답에 MID 필드가 없거나 예상값(${FIXED_MID})과 다릅니다.`);
    } else {
      console.log(`❌ API 요청 실패: ${responseData.message || '알 수 없는 오류'}`);
    }
    
  } catch (error) {
    console.error(`❌ 테스트 실행 중 오류 발생:`, error);
  }
}

// 테스트 실행
testCancelWithMid();