// Global window interface extensions for payment providers and other third-party libraries

// 포트원(PortOne) 타입 정의
declare global {
  interface Window {
    // 포트원 V2 (2023년 이후 버전) 관련 타입
    PortOne?: {
      getIMP: () => any;
      setGlobalConfiguration: (config: any) => void;
      loadUI: (config: string) => void;
    };
    
    // 포트원 V1 (iamport 레거시) 관련 타입
    IMP?: {
      // 필수 메서드
      init: (merchantID: string) => void;
      request_pay: (params: any, callback: (response: any) => void) => void;
      
      // 기본 속성들 (SDK 내부에서 사용됨)
      agency?: string;
      pg?: any;
      agent?: any;
      
      // PG 설정 관련 속성들
      PG_PROVIDER?: string;
      PG_MID?: string;
      PG_TYPE?: string;
      merchant_uid?: string;
      name?: string;
      amount?: number;
      buyer_email?: string;
      buyer_name?: string;
      buyer_tel?: string;
      buyer_addr?: string;
      buyer_postcode?: string;
      channel_key?: string;
      store_id?: string;
      
      // 추가 확장 속성 (타입스크립트 오류 해결용)
      [key: string]: any;
    };
    
    // 포트원 관련 콜백
    __PortOneSDKLoaded?: () => void;
    
    // 토스페이먼츠 결제 위젯 관련 타입
    PaymentWidget?: any;

    // 카카오 API 관련 타입 (다음 도로명 주소 검색 API)
    daum?: {
      Postcode?: any;
      maps?: any;
    };
  }
}
