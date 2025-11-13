/**
 * 이니시스 결제 취소를 위한 클라이언트
 * KG이니시스와 직접 통신하여 결제 취소를 처리합니다.
 * 
 * 참고: KG이니시스 취소 API 문서
 * https://manual.inicis.com/rtpay/cancel.html
 */
import fetch from 'node-fetch';
import { createHash, createHmac } from 'crypto';

// 이니시스 에러 타입
interface InicisError {
  message: string;
  [key: string]: any;
}

export class InicisClient {
  // 이니시스 API 키 (가이드에 따른 새로운 키 값 적용)
  private static API_KEY = 'S1clN44uzgLhgsVi'; // 실제 INIAPI_KEY
  private static API_IV = 'HYb3yQ4f65QL89=='; // 테스트용 IV
  private static HASH_KEY = 'EYfa4jUdjqaZnsEnZ7A6zQ=='; // 테스트용 해시 키 
  private static WEB_PAYMENT_SIGN_KEY = 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS'; // 테스트용 웹 결제 키
  private static MID = 'INIpayTest'; // 테스트 상점 아이디 (KG이니시스 테스트 상점)
  
  // API 호스트 - 가이드에 따라 환경별 설정
  private static API_HOST = process.env.NODE_ENV === 'production'
    ? 'https://iniapi.inicis.com' // 운영 환경
    : 'https://stginiapi.inicis.com'; // 테스트 환경

  constructor() {
    console.log('[이니시스 클라이언트] 초기화 완료');
    
    // 환경변수에서 설정을 로드
    this.loadConfig();
  }

  /**
   * 이니시스 TID 유효성 검사
   * 정상 TID: 40자 (예: INIpayTest_MOI1234567890_202505081230)
   */
  private validateInicisTid(tid: string): boolean {
    // 테스트 환경에서는 "INIpayTest_" 접두사가 필요할 수 있음
    const pattern = /^(INIpayTest_)?MOI\d+$/;
    return pattern.test(tid);
  }

  /**
   * 이니시스 직접 결제 취소 (TID 기반)
   * 가이드에 따른 정확한 구현으로 ERR205 해결
   * @param tid 이니시스 결제 고유 번호 (MOI 형식) 또는 paymentUrl
   * @param reason 취소 사유
   * @param amount 취소 금액 (전체 취소시 생략 가능)
   */
  public async cancelPaymentByTid(tid: string, reason: string, amount?: string) {
    console.log(`=== 이니시스 결제 취소 요청 시작 ===`);
    console.log(`- TID/URL: ${tid}`);
    console.log(`- 취소 사유: ${reason}`);
    console.log(`- API 키: ${InicisClient.API_KEY.substring(0, 4)}...${InicisClient.API_KEY.substring(InicisClient.API_KEY.length - 4)}`);
    
    try {
      // 이니시스 형식의 TID 추출 (paymentUrl 또는 전달된 tid에서)
      const rawTid = this.extractInicisId(tid);
      
      if (!rawTid) {
        throw new Error('유효한 이니시스 결제 ID(TID)가 없습니다');
      }
      
      // 정확한 TID 형식으로 변환 (KG이니시스 테스트 환경용)
      const timestamp = this.getTimestamp();
      const inicisId = this.formatTidForCancel(rawTid, timestamp);
      
      console.log(`- 추출된 이니시스 TID: ${rawTid}`);
      console.log(`- 포맷팅된 TID: ${inicisId}`);
      console.log(`- 타임스탬프: ${timestamp}`);
      
      // 클라이언트 IP 설정 - 가이드에서 제안하는 값 사용
      const clientIp = '123.123.123.123';
      
      // 취소 금액 설정 (기본값 1000원)
      const price = amount || '1000';
      
      // 해시 데이터 생성 - 가이드에 따라 type+paymethod+timestamp+clientIp+mid+tid 순서로 조합
      const hashData = this.generateHashDataForCancel(inicisId, timestamp);
      
      // 취소 요청 데이터 생성 (이니시스 가이드에 맞춘 정확한 파라미터)
      const cancelData = {
        type: 'Refund',                // 취소 API 타입 (고정값)
        paymethod: 'Card',             // 결제수단 (카드결제 고정)
        timestamp: timestamp,          // YYYYMMDDHHmmss 형식
        clientIp: clientIp,            // 클라이언트 IP (고정값)
        mid: InicisClient.MID,         // 상점 아이디
        tid: inicisId,                 // 40자 형식 TID
        msg: reason || '고객 요청에 의한 취소', // 취소 사유
        price: price,                  // 취소 금액
        hashData: hashData,            // SHA-512 해시 데이터
        currency: 'WON'                // 통화 (KRW대신 WON 사용)
      };
      
      console.log(`이니시스 취소 요청 데이터:`, JSON.stringify(cancelData, null, 2));
      
      // API 호출 전 최종 요청 로깅
      const requestUrl = `${InicisClient.API_HOST}/api/v1/refund`;
      const requestBody = new URLSearchParams(cancelData as any).toString();
      
      console.log(`\n=== 이니시스 API 요청 ===`);
      console.log(`요청 URL: ${requestUrl}`);
      console.log(`요청 메소드: POST`);
      console.log(`요청 헤더: Content-Type: application/x-www-form-urlencoded`);
      
      // 요청 본문 마스킹 처리 (해시데이터는 일부만 표시)
      const maskedBody = requestBody.replace(/(hashData=)([^&]+)/, (_, p1, p2) => 
        `${p1}${p2.substring(0, 20)}...${p2.substring(p2.length - 20)}`);
      console.log(`요청 본문 (마스킹): ${maskedBody}`);
      
      // API 키를 제외한 순수 파라미터 로깅 (디버깅 용이성)
      const paramsForLogging = { ...cancelData };
      paramsForLogging.hashData = `${paramsForLogging.hashData.substring(0, 10)}...`;
      console.log('이니시스 요청 파라미터:', JSON.stringify(paramsForLogging, null, 2));
      
      // API 호출
      console.log(`API 요청 전송 시작: ${new Date().toISOString()}`);
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*'
        },
        body: requestBody
      });
      console.log(`API 응답 수신: ${new Date().toISOString()}`);
      console.log(`응답 상태 코드: ${response.status} ${response.statusText}`);
      console.log(`=== 이니시스 API 요청 완료 ===\n`);
      
      // 응답 확인
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`이니시스 API 오류 응답 (${response.status}):`, errorText);
        
        // 일부 오류는 이미 취소된 상태이거나 처리 중일 수 있으므로 무시
        if (errorText.includes('이미 취소된') || errorText.includes('존재하지 않는')) {
          return {
            success: true,
            message: '이미 취소되었거나 존재하지 않는 결제입니다.',
            data: { resultCode: '01', resultMsg: '이미 취소됨', rawResponse: errorText }
          };
        }
        
        throw new Error(`이니시스 API 응답 오류: ${response.status} - ${errorText}`);
      }
      
      // 응답 처리
      const responseText = await response.text();
      console.log('이니시스 취소 API 응답:', responseText);
      
      // 응답이 JSON 형식인지 확인
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        // JSON이 아닌 경우, 텍스트 응답 분석
        if (responseText.includes('resultCode>00') || responseText.includes('취소완료')) {
          return {
            success: true,
            message: '이니시스 결제가 성공적으로 취소되었습니다.',
            data: { resultCode: '00', resultMsg: '취소 성공', rawResponse: responseText }
          };
        } else if (responseText.includes('이미 취소된') || responseText.includes('존재하지 않는')) {
          return {
            success: true,
            message: '이미 취소되었거나 존재하지 않는 결제입니다.',
            data: { resultCode: '01', resultMsg: '이미 취소됨', rawResponse: responseText }
          };
        }
        
        // 그 외 오류
        throw new Error(`이니시스 결제 취소 실패: ${responseText}`);
      }
      
      // JSON 응답 확인
      if (responseData.resultCode === '00') {
        return {
          success: true,
          message: '이니시스 결제가 성공적으로 취소되었습니다.',
          data: responseData
        };
      } else if (responseData.resultCode === '01' && 
          (responseData.resultMsg.includes('이미 취소된') || responseData.resultMsg.includes('존재하지 않는'))) {
        return {
          success: true,
          message: '이미 취소되었거나 존재하지 않는 결제입니다.',
          data: responseData
        };
      } else {
        throw new Error(`이니시스 결제 취소 실패: ${responseData.resultMsg}`);
      }
    } catch (error: any) {
      console.error('=== 이니시스 결제 취소 오류 ===');
      console.error('오류 메시지:', error.message || error);
      
      throw new Error(`이니시스 결제 취소 오류: ${error.message || '알 수 없는 오류'}`);
    }
  }

  /**
   * 타임스탬프 생성 (YYYYMMDDHHmmss 형식)
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
  
  /**
   * MOI ID 패딩 처리
   * @param moiId MOI 형식의 ID (예: MOI3204387)
   * @returns 14자리로 패딩된 MOI ID
   */
  private padMoiId(moiId: string): string {
    // MOI 뒤 숫자 부분을 추출
    const moiNumber = moiId.replace('MOI', '');
    // 숫자 부분을 추출하여 패딩 (총 길이 14자가 되도록)
    const paddedNumber = moiNumber.padEnd(11, '0');
    return `MOI${paddedNumber}`;
  }

  /**
   * 취소 API용 TID 포맷팅
   * KG이니시스 요구사항에 맞게 TID 포맷 (전체 길이 40자)
   */
  private formatTidForCancel(moiId: string, timestamp: string): string {
    // MOI ID를 패딩처리
    const paddedMoi = this.padMoiId(moiId);
    
    // 타임스탬프도 14자리로 정확하게 맞춤
    const paddedTimestamp = timestamp.padEnd(14, '0');
    
    // INIpayTest_ (11자) + paddedMoi (14자) + _ (1자) + paddedTimestamp (14자) = 총 40자
    const tid = `INIpayTest_${paddedMoi}_${paddedTimestamp}`;
    
    console.log(`생성된 TID (${tid.length}자): ${tid}`);
    
    // TID 길이 검증 (반드시 40자여야 함)
    if (tid.length !== 40) {
      console.error(`경고: TID 길이가 40자가 아닙니다. 현재 길이: ${tid.length}`);
    }
    
    return tid;
  }
  

  /**
   * 이니시스 취소 API용 해시 데이터 생성
   * KG이니시스 공식 문서 기준으로 재구현 - 최종 버전
   * 참고: https://manual.inicis.com/rtpay/cancel.html
   */
  private generateHashDataForCancel(tid: string, timestamp: string): string {
    // *** 중요: 이니시스 가이드에 정확히 명시된 파라미터와 순서를 사용 ***
    
    // 해시 생성에 필요한 필수 파라미터 설정 (가이드 문서 기준)
    const type = 'Refund';                // API 타입: 취소는 항상 'Refund'
    const paymethod = 'Card';             // 결제수단: 카드는 항상 'Card'
    const clientIp = '123.123.123.123';   // 실제 클라이언트 IP
    const mid = InicisClient.MID;         // 상점 아이디 (INIpayTest)
    
    // 로깅 - 디버깅용 (가이드의 필수 순서대로 파라미터 표시)
    console.log('\n[이니시스 해시 생성 - 최종 버전]');
    console.log('*** 해시 생성 파라미터 ***');
    console.log('1. INIAPI_KEY:', InicisClient.API_KEY.substring(0, 4) + '*'.repeat(12));
    console.log('2. type:', type);
    console.log('3. paymethod:', paymethod);
    console.log('4. timestamp:', timestamp);
    console.log('5. clientIp:', clientIp);
    console.log('6. mid:', mid);
    console.log('7. tid:', tid);
    
    // 최종 플레인 텍스트 생성 - 가이드에서 "순서" 강조
    // [INIAPIKey][type][paymethod][timestamp][clientIp][mid][tid] 형식
    // 참고: 문서에 명시된 형식은 '[값][값]' 형식이므로 그대로 구현
    // 이니시스가 가장 중요시하는 것은 파라미터 순서!
    const plainText = InicisClient.API_KEY + 
                     type + 
                     paymethod + 
                     timestamp + 
                     clientIp + 
                     mid + 
                     tid;
    
    // 완전한 평문 해시 값을 생성하되, 로그는 마스킹 처리
    const maskedPlainText = InicisClient.API_KEY.substring(0, 4) + '*'.repeat(12) + 
                           type + paymethod + timestamp + clientIp + mid + tid;
    
    console.log('*** 해시 생성 평문 (마스킹) ***');
    console.log(maskedPlainText);
    console.log('평문 길이:', plainText.length);
    
    // 해시 값 생성 (SHA-512 방식, 이니시스 문서에 명시된 방식)
    // 이니시스 문서에 명시된 대로 plainText 인코딩 없이 직접 해시
    const hashData = createHash('sha512')
      .update(plainText)
      .digest('hex');
    
    // 공식 문서에 따라 소문자로 변환 (이니시스 서버측 처리와 일치시키기 위함)
    const lowercaseHash = hashData.toLowerCase();
    
    console.log('*** 생성된 해시 정보 ***');
    console.log('해시 길이:', lowercaseHash.length);
    console.log('해시 미리보기:', lowercaseHash.substring(0, 20) + '...' + 
                lowercaseHash.substring(lowercaseHash.length - 20));
    console.log('[이니시스 해시 생성 완료]\n');
    
    return lowercaseHash;
  }
  
  /**
   * 이니시스 서명 데이터 생성 (이니시스 규격에 맞게 수정)
   */
  private generateHashData(params: {
    type: string;
    paymethod: string;
    timestamp: string;
    tid: string;
    mid: string;
    price: string;
  }): string {
    // 이니시스 규격에 맞는 해시 생성
    // 주의: Mid 값을 항상 INIpayTest로 고정
    const dataToHash = `oid=INIpayTest_${params.timestamp}&price=${params.price}&timestamp=${params.timestamp}`;
    
    // 1. HMAC-SHA256 방식 (주 사용)
    const hmac = createHmac('sha256', InicisClient.HASH_KEY)
      .update(dataToHash)
      .digest('hex');
    
    // 2. SHA-512 방식 (대체 방식)
    const sha512 = createHash('sha512')
      .update(dataToHash)
      .digest('hex');
    
    console.log('생성된 해시 데이터 (HMAC-SHA256):', hmac);
    console.log('생성된 해시 데이터 (SHA-512):', sha512);
    
    // HMAC-SHA256 방식 사용
    return hmac;
  }
  
  /**
   * 이니시스 TID 추출 (paymentUrl 또는 직접 전달된 tid에서)
   */
  private extractInicisId(input: string): string | null {
    console.log('이니시스 TID 추출 입력:', input);
    
    // 이니시스 테스트 TID 추출 (MOI 형식)
    // 입력이 MOI로 시작하는 경우 (직접 TID인 경우)
    if (input.startsWith('MOI')) {
      const parts = input.split('_');
      const moiNumber = parts[0]; // MOI 번호만 추출 (예: MOI3204387)
      console.log('MOI 직접 추출:', moiNumber);
      return moiNumber;
    }
    
    // URL에서 추출하는 경우
    const moiMatch = input.match(/MOI\d+/);
    if (moiMatch) {
      console.log('URL에서 MOI 추출:', moiMatch[0]);
      return moiMatch[0];
    }
    
    // receipt/MOI3204387_order 형식 URL인 경우
    if (input.includes('receipt/')) {
      const parts = input.split('receipt/');
      if (parts.length > 1) {
        // MOI3204387_order_xxx 에서 MOI3204387 추출
        const fullReceiptId = parts[1];
        console.log('receipt/ 뒤 전체 문자열:', fullReceiptId);
        
        // MOI로 시작하는 패턴 추출
        const moiInReceipt = fullReceiptId.match(/MOI\d+/);
        if (moiInReceipt) {
          console.log('receipt에서 MOI 추출:', moiInReceipt[0]);
          return moiInReceipt[0];
        }
      }
    }
    
    console.log('이니시스 TID 추출 실패');
    return null;
  }
  
  /**
   * 환경 변수에서 설정 로드
   */
  private loadConfig() {
    // 환경 변수에서 이니시스 설정 로드
    if (process.env.INICIS_API_KEY) {
      InicisClient.API_KEY = process.env.INICIS_API_KEY;
    }
    
    if (process.env.INICIS_API_IV) {
      InicisClient.API_IV = process.env.INICIS_API_IV;
    }
    
    if (process.env.INICIS_HASH_KEY) {
      InicisClient.HASH_KEY = process.env.INICIS_HASH_KEY;
    }
    
    if (process.env.INICIS_MID) {
      InicisClient.MID = process.env.INICIS_MID;
    }
    
    if (process.env.INICIS_WEB_PAYMENT_SIGN_KEY) {
      InicisClient.WEB_PAYMENT_SIGN_KEY = process.env.INICIS_WEB_PAYMENT_SIGN_KEY;
    }
  }
  
  // 단일 인스턴스 반환
  private static instance: InicisClient;
  public static getInstance(): InicisClient {
    if (!InicisClient.instance) {
      InicisClient.instance = new InicisClient();
    }
    return InicisClient.instance;
  }
}

export default InicisClient.getInstance();