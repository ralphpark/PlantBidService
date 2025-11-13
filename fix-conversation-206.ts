/**
 * 🔧 대화 206 중복 검토 메시지 즉시 정리
 */

import { pool } from './server/db';

async function fixConversation206() {
  try {
    console.log('🔧 대화 206 중복 메시지 정리 시작...');
    
    // 대화 206 조회
    const result = await pool.query('SELECT messages FROM conversations WHERE id = 206');
    
    if (result.rows.length === 0) {
      console.log('❌ 대화 206을 찾을 수 없습니다.');
      return;
    }
    
    let messages = JSON.parse(result.rows[0].messages);
    console.log(`📊 현재 메시지 수: ${messages.length}`);
    
    // 판매자 3의 검토 메시지 찾기
    const vendor3ReviewMessages = [];
    const otherMessages = [];
    
    for (const msg of messages) {
      if (msg.role === 'vendor' && 
          msg.vendorId === 3 && 
          (msg.content?.includes('검토중입니다') || 
           msg.content?.includes('상품이 추가되어 입찰을 검토중') ||
           msg.bidStatus === 'reviewing')) {
        vendor3ReviewMessages.push(msg);
        console.log('🔍 검토 메시지 발견:', msg.content);
      } else {
        otherMessages.push(msg);
      }
    }
    
    console.log(`📝 판매자 3의 검토 메시지: ${vendor3ReviewMessages.length}개`);
    
    if (vendor3ReviewMessages.length > 1) {
      // 시간순 정렬하여 첫 번째만 유지
      vendor3ReviewMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // 첫 번째 메시지만 다시 추가
      otherMessages.push(vendor3ReviewMessages[0]);
      
      // 시간순으로 다시 정렬
      otherMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // 데이터베이스 업데이트
      await pool.query(
        'UPDATE conversations SET messages = $1 WHERE id = 206',
        [JSON.stringify(otherMessages)]
      );
      
      console.log(`✅ ${vendor3ReviewMessages.length - 1}개 중복 메시지 제거 완료!`);
      console.log(`📊 정리 후 메시지 수: ${otherMessages.length}`);
      console.log('✨ 이제 단 1개의 검토 메시지만 표시됩니다!');
    } else {
      console.log('💫 중복 메시지가 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 대화 206 정리 중 오류:', error);
  } finally {
    process.exit(0);
  }
}

fixConversation206();