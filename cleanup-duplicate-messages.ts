/**
 * 🧹 중복 검토 메시지 정리 스크립트
 * 
 * 문제: 여러 개의 "입찰내용을 검토중입니다" 메시지가 중복 생성됨
 * 해결: 각 판매자별로 최초 1개의 검토 메시지만 남기고 나머지 제거
 */

import { pool } from './server/db';

interface Message {
  role: string;
  content: string;
  timestamp: string;
  vendorId?: number;
  vendorName?: string;
  bidStatus?: string;
  [key: string]: any;
}

async function cleanupDuplicateMessages() {
  try {
    console.log('🧹 중복 검토 메시지 정리 시작...');
    
    // 모든 대화 조회
    const conversationsResult = await pool.query('SELECT id, messages FROM conversations');
    let totalCleaned = 0;
    let conversationsCleaned = 0;
    
    for (const conversation of conversationsResult.rows) {
      const conversationId = conversation.id;
      let messages: Message[] = [];
      
      try {
        // 메시지 파싱
        if (typeof conversation.messages === 'string') {
          messages = JSON.parse(conversation.messages);
        } else if (Array.isArray(conversation.messages)) {
          messages = conversation.messages;
        } else {
          continue;
        }
        
        if (!Array.isArray(messages) || messages.length === 0) {
          continue;
        }
        
        // 판매자별로 검토 메시지 그룹화
        const reviewMessagesByVendor = new Map<number, Message[]>();
        const otherMessages: Message[] = [];
        
        for (const message of messages) {
          if (message.role === 'vendor' && 
              message.content && 
              (message.content.includes('검토중입니다') || 
               message.content.includes('입찰내용을 검토중') ||
               message.content.includes('상품이 추가되어 입찰을 검토중'))) {
            
            const vendorId = message.vendorId;
            if (vendorId) {
              if (!reviewMessagesByVendor.has(vendorId)) {
                reviewMessagesByVendor.set(vendorId, []);
              }
              reviewMessagesByVendor.get(vendorId)!.push(message);
            }
          } else {
            otherMessages.push(message);
          }
        }
        
        // 각 판매자별로 첫 번째 검토 메시지만 남기기
        let removedCount = 0;
        const keepMessages: Message[] = [...otherMessages];
        
        for (const [vendorId, reviewMessages] of reviewMessagesByVendor) {
          if (reviewMessages.length > 1) {
            console.log(`📝 대화 ${conversationId} - 판매자 ${vendorId}: ${reviewMessages.length}개 검토 메시지 발견`);
            
            // 시간순 정렬하여 첫 번째만 유지
            reviewMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            // 첫 번째 메시지만 유지하고 나머지 제거
            keepMessages.push(reviewMessages[0]);
            removedCount += reviewMessages.length - 1;
            
            console.log(`✂️  ${reviewMessages.length - 1}개 중복 메시지 제거, 1개 유지`);
          } else if (reviewMessages.length === 1) {
            // 중복이 없으면 그대로 유지
            keepMessages.push(reviewMessages[0]);
          }
        }
        
        // 변경사항이 있으면 업데이트
        if (removedCount > 0) {
          // 시간순으로 다시 정렬
          keepMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // 데이터베이스 업데이트
          await pool.query(
            'UPDATE conversations SET messages = $1 WHERE id = $2',
            [JSON.stringify(keepMessages), conversationId]
          );
          
          totalCleaned += removedCount;
          conversationsCleaned++;
          
          console.log(`✅ 대화 ${conversationId}: ${removedCount}개 중복 메시지 제거 완료`);
        }
        
      } catch (error) {
        console.error(`❌ 대화 ${conversationId} 처리 중 오류:`, error);
      }
    }
    
    console.log('\n🎉 중복 메시지 정리 완료!');
    console.log(`📊 통계:`);
    console.log(`  - 정리된 대화 수: ${conversationsCleaned}개`);
    console.log(`  - 제거된 중복 메시지: ${totalCleaned}개`);
    
    if (totalCleaned > 0) {
      console.log('\n✨ 이제 각 판매자별로 단 1개의 "입찰내용을 검토중입니다" 메시지만 표시됩니다!');
    } else {
      console.log('\n💫 중복 메시지가 발견되지 않았습니다. 모든 대화가 깔끔합니다!');
    }
    
  } catch (error) {
    console.error('❌ 중복 메시지 정리 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
cleanupDuplicateMessages();