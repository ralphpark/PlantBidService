/**
 * 🎯 대화 206 직접 수정 - 중복 검토 메시지 제거
 */

import { pool } from './server/db';

async function directFix206() {
  try {
    console.log('🎯 대화 206 직접 수정 시작...');
    
    // 대화 206 조회
    const result = await pool.query('SELECT messages FROM conversations WHERE id = 206');
    
    if (result.rows.length === 0) {
      console.log('❌ 대화 206을 찾을 수 없습니다.');
      return;
    }
    
    const messagesText = result.rows[0].messages;
    console.log('📊 원본 메시지 타입:', typeof messagesText);
    
    let messages;
    try {
      if (typeof messagesText === 'string') {
        messages = JSON.parse(messagesText);
      } else {
        messages = messagesText;
      }
    } catch (e) {
      console.log('❌ JSON 파싱 실패, 직접 문자열 처리 시도');
      return;
    }
    
    console.log(`📊 현재 메시지 수: ${messages.length}`);
    
    // 정확한 중복 제거 로직
    const filteredMessages = [];
    let hasReviewMessage = false;
    
    for (const msg of messages) {
      // 판매자 3의 검토 메시지인지 확인
      if (msg.role === 'vendor' && 
          msg.vendorId === 3 && 
          (msg.content?.includes('검토중입니다') || 
           msg.content?.includes('상품이 추가되어 입찰을 검토중') ||
           msg.bidStatus === 'reviewing')) {
        
        // 첫 번째 검토 메시지만 유지 (텍스트가 있는 것 우선)
        if (!hasReviewMessage && msg.content && msg.content.trim() !== '') {
          filteredMessages.push(msg);
          hasReviewMessage = true;
          console.log('✅ 검토 메시지 유지:', msg.content);
        } else {
          console.log('🚫 중복 검토 메시지 제거:', msg.content || '빈 메시지');
        }
      } else {
        // 검토 메시지가 아닌 경우 모두 유지
        filteredMessages.push(msg);
      }
    }
    
    console.log(`📊 정리 후 메시지 수: ${filteredMessages.length}`);
    
    // 데이터베이스 업데이트
    await pool.query(
      'UPDATE conversations SET messages = $1 WHERE id = 206',
      [JSON.stringify(filteredMessages)]
    );
    
    console.log('✅ 대화 206 중복 메시지 제거 완료!');
    console.log('🎉 이제 단 1개의 검토 메시지만 표시됩니다!');
    
  } catch (error) {
    console.error('❌ 직접 수정 중 오류:', error);
  } finally {
    process.exit(0);
  }
}

directFix206();