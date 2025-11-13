/**
 * 🔥 중복 검토 메시지 완전 제거 - 궁극의 해결책
 */

import { pool } from './server/db';

async function ultimateFixDuplicateMessages() {
  try {
    console.log('🔥 모든 대화의 중복 검토 메시지 완전 제거 시작...');
    
    // 모든 대화 조회
    const conversations = await pool.query('SELECT id, messages FROM conversations');
    
    let totalFixed = 0;
    
    for (const conv of conversations.rows) {
      let messages = JSON.parse(conv.messages);
      const originalCount = messages.length;
      
      // 판매자별로 검토 메시지 그룹화
      const vendorReviewMessages = new Map();
      const keptMessages = [];
      
      for (const msg of messages) {
        if (msg.role === 'vendor' && msg.vendorId) {
          // 검토 관련 메시지인지 확인
          const isReviewMessage = (
            (msg.content && (
              msg.content.includes('검토중입니다') ||
              msg.content.includes('상품이 추가되어 입찰을 검토중')
            )) ||
            msg.bidStatus === 'reviewing' ||
            (msg.bidStatus === 'sent' && msg.content === '입찰내용을 검토중입니다')
          );
          
          if (isReviewMessage) {
            const vendorKey = `vendor_${msg.vendorId}`;
            
            if (!vendorReviewMessages.has(vendorKey)) {
              // 첫 번째 검토 메시지만 유지 (텍스트가 있는 것 우선)
              if (msg.content && msg.content.trim() !== '') {
                vendorReviewMessages.set(vendorKey, msg);
                keptMessages.push(msg);
                console.log(`✅ 판매자 ${msg.vendorId}의 검토 메시지 유지: "${msg.content}"`);
              }
            } else {
              console.log(`🚫 판매자 ${msg.vendorId}의 중복 검토 메시지 제거: "${msg.content || '빈 메시지'}"`);
            }
          } else {
            // 검토 메시지가 아닌 일반 메시지는 유지
            keptMessages.push(msg);
          }
        } else {
          // 판매자 메시지가 아닌 경우 유지
          keptMessages.push(msg);
        }
      }
      
      if (keptMessages.length < originalCount) {
        // 시간순 정렬
        keptMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // 데이터베이스 업데이트
        await pool.query(
          'UPDATE conversations SET messages = $1 WHERE id = $2',
          [JSON.stringify(keptMessages), conv.id]
        );
        
        console.log(`📝 대화 ${conv.id}: ${originalCount} → ${keptMessages.length} (${originalCount - keptMessages.length}개 제거)`);
        totalFixed++;
      }
    }
    
    console.log(`\n🎉 총 ${totalFixed}개 대화에서 중복 검토 메시지 제거 완료!`);
    console.log('✨ 이제 모든 대화에서 깔끔한 단일 검토 메시지만 표시됩니다!');
    
  } catch (error) {
    console.error('❌ 중복 메시지 제거 중 오류:', error);
  } finally {
    process.exit(0);
  }
}

ultimateFixDuplicateMessages();