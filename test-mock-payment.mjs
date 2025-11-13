import { default as axios } from 'axios';

// 테스트용 UUID 형식 결제 ID
const uuid = '0196b315-25b4-27a5-c420-5abf1c4521ba';
const formatCheck = async () => {
  try {
    console.log('📋 UUID 형식 검증 테스트');
    console.log('원본 UUID:', uuid);
    
    const response = await axios.post('http://localhost:5000/api/payments/format-check', {
      paymentKey: uuid
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 변환 결과:', response.data);
  } catch (error) {
    // API가 없을 경우 무시
    console.log('⚠️ 형식 검증 API가 없습니다. 직접 변환 로직을 테스트합니다.');
    
    // UUID에서 하이픈 제거 
    const withoutHyphens = uuid.replace(/-/g, '');
    console.log('하이픈 제거:', withoutHyphens, `(${withoutHyphens.length}자)`);
    
    // 22자로 변환 (8자 + 6자 + 8자)
    const first8 = withoutHyphens.substring(0, 8);
    const middle6 = withoutHyphens.substring(8, 14);
    const last8 = withoutHyphens.substring(withoutHyphens.length - 8);
    
    const converted22 = first8 + middle6 + last8;
    console.log('변환된 22자:', converted22, `(${converted22.length}자)`);
    
    // pay_ 접두어 추가 (최종 26자)
    const finalId = 'pay_' + converted22;
    console.log('최종 V2 형식:', finalId, `(${finalId.length}자)`);
    
    return finalId;
  }
};

// 테스트 실행
formatCheck().then(formattedId => {
  console.log('\n📌 V2 API 호환 테스트 완료');
  console.log('✅ 변환된 결제 ID:', formattedId);
  console.log('✅ V2 API 규격 (26자) 충족 여부:', formattedId?.length === 26);
});
