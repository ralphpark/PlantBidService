import { default as axios } from 'axios';

// 테스트용 UUID 형식 결제 ID
const uuid = '0196b315-25b4-27a5-c420-5abf1c4521ba';

async function testFormatCheck() {
  try {
    console.log('🔍 결제 ID 형식 변환 테스트 시작');
    console.log(`원본 UUID: ${uuid}`);
    
    // 직접 API 경로 사용
    const response = await axios.post('http://localhost:5000/direct/payments/format-check', {
      paymentKey: uuid
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 응답 상태 코드:', response.status);
    
    // 컨텐츠 타입 확인
    if (response.headers['content-type']?.includes('application/json')) {
      console.log('✅ JSON 응답 확인됨');
      console.log('✅ 응답 데이터:', JSON.stringify(response.data, null, 2));
      
      if (response.data.formattedKey) {
        console.log('\n📊 변환 결과 분석:');
        console.log('원본 ID:', response.data.originalKey);
        console.log('변환된 ID:', response.data.formattedKey);
        console.log('ID 길이:', response.data.length);
        console.log('V2 API 규격 충족 여부:', response.data.isV2Format ? '✅ 충족' : '❌ 미충족');
      }
    } else {
      console.error('❌ JSON이 아닌 다른 형식의 응답:', response.headers['content-type']);
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
testFormatCheck();
