import { default as axios } from 'axios';

// 다양한 형식의 ID 테스트
const testIds = [
  '0196b315-25b4-27a5-c420-5abf1c4521ba', // 표준 UUID
  'pay_123456789012345678901', // pay_ 형식이지만 짧음
  'pay_12345678901234567890123456', // pay_ 형식이지만 길이 초과
  'abc123', // 매우 짧은 ID
  'some_random_text_that_is_not_a_valid_id', // 무작위 긴 텍스트
  null // null 테스트 (API에서 처리되어야 함)
];

async function testIdFormat(id) {
  try {
    console.log(`\n\n🔍 ID 형식 테스트: "${id || 'null'}"`);
    
    const response = await axios.post('http://localhost:5000/direct/payments/format-check', {
      paymentKey: id
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 응답 상태 코드:', response.status);
    console.log('✅ 응답 데이터:', JSON.stringify(response.data, null, 2));
    
    if (response.data.formattedKey) {
      console.log('📊 변환 결과:');
      console.log('원본 ID:', response.data.originalKey);
      console.log('변환된 ID:', response.data.formattedKey);
      console.log('ID 길이:', response.data.length);
      console.log('V2 API 규격 충족 여부:', response.data.isV2Format ? '✅ 충족' : '❌ 미충족');
      
      // 모든 결과가 26자인지 확인
      if (response.data.length !== 26) {
        console.error('❌ 오류: 변환된 ID 길이가 26자가 아님:', response.data.length);
      }
      
      // 모든 결과가 pay_로 시작하는지 확인
      if (!response.data.formattedKey.startsWith('pay_')) {
        console.error('❌ 오류: 변환된 ID가 "pay_"로 시작하지 않음:', response.data.formattedKey);
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
  }
}

// 모든 테스트 ID 확인
async function runTests() {
  for (const id of testIds) {
    await testIdFormat(id);
  }
  console.log('\n✅ 모든 테스트 완료');
}

// 테스트 실행
runTests();
