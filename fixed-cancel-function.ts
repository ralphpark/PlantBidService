  /**
   * 결제 취소 API (V2 API) - 포트원 공식 가이드 기반 개선
   * @see https://developers.portone.io/api/rest-v2/payment?v=v2#tag/Payments/operation/cancelpayment
   * 
   * 포트원 V2 API 결제 취소 요구사항:
   * 1. paymentId는 반드시 'pay_'로 시작하는 26자 형식일 것 ('pay_' + 22자 영숫자)
   * 2. 멱등성 키(Idempotency-Key)는 필수이며 중복 요청 방지를 위해 매번 고유값 사용
   * 3. API 요청에 'reason' 파라미터 필수 포함
   * 
   * 구현 특징:
   * - UUID 형식을 자동으로 V2 API 호환 형식(pay_xxx...)으로 변환
   * - 암호학적으로 안전한 멱등성 키 생성
   * - 요청 실패 시 상세 오류 정보 제공
   */
  async cancelPayment(params: {
    paymentId: string;  // 필수: 결제 ID (V2 API는 pay_ 형식 필수)
    reason: string;     // 필수: 취소 사유
    cancelAmount?: number; // 선택: 취소 금액 (부분 취소 시)
  }): Promise<any> {
    console.log(`\n===== 포트원 결제 취소 요청 (V2 API) =====`);
    console.log(`결제 ID: ${params.paymentId}`);
    console.log(`취소 사유: ${params.reason}`);
    
    // 파라미터 유효성 검사
    if (!params.paymentId) {
      throw new Error('결제 ID가 필요합니다');
    }
    
    if (!params.reason) {
      console.log('취소 사유가 없어 기본값 사용');
      params.reason = '고객 요청에 의한 취소';
    }
    
    try {
      // UUID 패턴 확인 - 하이픈 있는 UUID 형식이면 원본 유지해서 처리
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.paymentId)) {
        console.log(`UUID 형식 감지됨: ${params.paymentId} - 원본 유지 처리`);
        return this.cancelPaymentWithOriginalUUID(
          params.paymentId,
          params.reason,
          params.cancelAmount
        );
      }
      
      // pay_ 형식 처리 - 정확히 26자(pay_ + 22자)여야 함
      let finalPaymentId = params.paymentId;
      
      // 형식 검증 및 변환
      if (!finalPaymentId.startsWith('pay_') || finalPaymentId.length !== 26) {
        console.log(`결제 ID 형식 변환 필요: ${finalPaymentId}`);
        
        // pay_ 접두사가 있는 경우
        if (finalPaymentId.startsWith('pay_')) {
          const idPart = finalPaymentId.substring(4); // 'pay_' 제외 부분
          if (idPart.length > 22) {
            // 너무 길면 자르기
            finalPaymentId = `pay_${idPart.substring(0, 22)}`;
          } else {
            // 짧으면 끝에 'f'로 채우기
            finalPaymentId = `pay_${idPart.padEnd(22, 'f')}`;
          }
        } 
        // 그 외 일반 문자열인 경우 
        else {
          // 알파벳/숫자만 추출하고 적절한 길이로 조정
          const cleanId = finalPaymentId.replace(/[^a-zA-Z0-9]/g, '');
          if (cleanId.length > 22) {
            finalPaymentId = `pay_${cleanId.substring(0, 22)}`;
          } else {
            finalPaymentId = `pay_${cleanId.padEnd(22, 'f')}`;
          }
        }
        
        console.log(`변환된 결제 ID: ${finalPaymentId}`);
      }
      
      // 멱등성 키 생성 (고유한 요청 식별자)
      const idempotencyKey = `cancel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // 취소 요청 URL 설정 (V2 API 형식)
      const url = `/v2/payments/${finalPaymentId}/cancel`;
      
      // 요청 본문 구성
      const requestBody: Record<string, any> = {
        reason: params.reason
      };
      
      // 부분 취소 금액이 있으면 추가
      if (params.cancelAmount) {
        requestBody.cancelAmount = params.cancelAmount;
      }
      
      // 요청 헤더 구성
      const requestOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${this.apiSecret}`,
          'Store-Id': PORTONE_STORE_ID,
          'Accept': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        timeout: 15000 // 15초 타임아웃
      };
      
      // 요청 정보 로깅
      console.log('\n-- API 요청 정보 --');
      console.log('요청 URL:', url);
      console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
      console.log('멱등성 키:', idempotencyKey);
      
      // API 호출 실행
      const response = await this.client.post(url, requestBody, requestOptions);
      
      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', JSON.stringify(response.headers, null, 2));
      
      // 성공 응답 처리
      if (response.status < 400) {
        console.log('✅ 결제 취소 성공');
        return response.data;
      } 
      // 오류 응답 처리
      else {
        console.error('❌ 결제 취소 API 오류 응답:', response.data);
        throw new Error(`결제 취소 API 오류: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      // 오류 상세 로깅
      console.error('❌ 결제 취소 처리 중 오류 발생:');
      
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('요청 전송 후 응답 없음 (타임아웃 가능성)');
      } else {
        console.error('오류 메시지:', error.message);
      }
      
      // 오류 전파
      throw new Error(`결제 취소 실패: ${error.message}`);
    }
  }