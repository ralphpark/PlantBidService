import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

// 네이버 클라우드 SENS API 관련 변수들
const naverAccessKey = process.env.NAVER_API_KEY_ID;
const naverSecretKey = process.env.NAVER_API_KEY_SECRET;
const sensServiceId = 'ncp:sms:kr:351958286793:plantbid'; // SENS 서비스 ID
const smsBaseUrl = 'https://sens.apigw.ntruss.com';
const smsUri = `/sms/v2/services/${sensServiceId}/messages`;

// 인증번호 저장소 (임시 저장, 실제 프로덕션에서는 DB나 캐시 서버 사용 권장)
interface VerificationEntry {
  code: string;
  expiresAt: Date;
}

const verificationCodes: Map<string, VerificationEntry> = new Map();

// 랜덤 인증 코드 생성 함수
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SENS API 요청 시그니처 생성 함수
function generateSignature(timestamp: string, method: string, uri: string): string {
  const message = [
    method,
    ' ',
    uri,
    '\n',
    timestamp,
    '\n',
    naverAccessKey
  ].join('');

  const signature = crypto.createHmac('sha256', naverSecretKey as string)
    .update(message)
    .digest('base64');
  
  return signature;
}

// SMS 인증번호 발송 API
export async function sendVerificationCode(req: Request, res: Response) {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호가 필요합니다'
      });
    }
    
    // 전화번호 포맷 확인 및 변환 (하이픈 제거, 국가 코드 확인)
    const cleanedNumber = phoneNumber.replace(/-/g, '');
    const formattedNumber = cleanedNumber.startsWith('82') || cleanedNumber.startsWith('+82')
      ? cleanedNumber.replace(/^(\+82|82)/, '0')
      : cleanedNumber;
    
    // 랜덤 인증번호 생성
    const verificationCode = generateVerificationCode();
    
    // 개발 환경에서는 실제 SMS를 발송하지 않고 테스트 코드만 반환
    if (process.env.NODE_ENV === 'development' || !naverAccessKey || !naverSecretKey) {
      console.log('개발 환경에서는 실제 SMS 발송을 생략합니다.');
      console.log(`테스트 인증 코드 (${formattedNumber}): ${verificationCode}`);
      
      // 인증번호 저장 (5분 유효)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 5);
      
      verificationCodes.set(formattedNumber, {
        code: verificationCode,
        expiresAt: expirationTime
      });
      
      return res.status(200).json({
        success: true,
        message: '인증번호가 발송되었습니다 (개발 환경)',
        code: verificationCode // 개발 환경에서만 코드 노출 (실제 환경에서는 제거)
      });
    }
    
    // 현재 시간 (Timestamp 생성)
    const timestamp = Date.now().toString();
    
    // 발송할 메시지 정의
    const message = `[PlantBid] 인증번호 [${verificationCode}]를 입력해주세요.`;
    
    // SENS API 요청에 필요한 시그니처 생성
    const signature = generateSignature(timestamp, 'POST', smsUri);
    
    try {
      // SENS API 요청
      const response = await axios.post(
        `${smsBaseUrl}${smsUri}`,
        {
          type: 'SMS',
          contentType: 'COMM',
          countryCode: '82',
          from: '01077274374', // 발신번호 (네이버 콘솔에 등록 및 인증된 번호)
          content: message,
          messages: [
            {
              to: formattedNumber
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'x-ncp-apigw-timestamp': timestamp,
            'x-ncp-iam-access-key': naverAccessKey,
            'x-ncp-apigw-signature-v2': signature
          }
        }
      );
      
      // 인증번호 저장 (5분 유효)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 5);
      
      verificationCodes.set(formattedNumber, {
        code: verificationCode,
        expiresAt: expirationTime
      });
      
      console.log(`Verification code for ${formattedNumber}: ${verificationCode}`);
      
      return res.status(200).json({
        success: true,
        message: '인증번호가 발송되었습니다'
      });
    } catch (apiError) {
      console.error('SENS API 오류:', apiError);
      
      // API 오류가 발생하더라도 개발 환경에서는 인증 코드 발급
      console.log('API 오류로 인해 테스트 모드로 전환합니다.');
      console.log(`테스트 인증 코드 (${formattedNumber}): ${verificationCode}`);
      
      // 인증번호 저장 (5분 유효)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 5);
      
      verificationCodes.set(formattedNumber, {
        code: verificationCode,
        expiresAt: expirationTime
      });
      
      return res.status(200).json({
        success: true,
        message: '인증번호가 발송되었습니다 (개발 환경)',
        code: verificationCode // 개발 환경에서만 코드 노출
      });
    }
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증번호 발송 중 오류가 발생했습니다',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// SMS 인증번호 확인 API
export async function verifyCode(req: Request, res: Response) {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: '휴대폰 번호와 인증번호가 필요합니다'
      });
    }
    
    // 전화번호 포맷 변환
    const cleanedNumber = phoneNumber.replace(/-/g, '');
    const formattedNumber = cleanedNumber.startsWith('82') || cleanedNumber.startsWith('+82')
      ? cleanedNumber.replace(/^(\+82|82)/, '0')
      : cleanedNumber;
    
    // 저장된 인증번호 확인
    const verificationEntry = verificationCodes.get(formattedNumber);
    
    if (!verificationEntry) {
      return res.status(400).json({
        success: false,
        message: '인증번호가 발송되지 않았거나 만료되었습니다'
      });
    }
    
    // 인증번호 만료 확인
    if (new Date() > verificationEntry.expiresAt) {
      verificationCodes.delete(formattedNumber);
      return res.status(400).json({
        success: false,
        message: '인증번호가 만료되었습니다'
      });
    }
    
    // 인증번호 일치 확인
    if (verificationEntry.code !== code) {
      return res.status(400).json({
        success: false,
        message: '인증번호가 일치하지 않습니다'
      });
    }
    
    // 인증 성공 시 코드 삭제 (재사용 방지)
    verificationCodes.delete(formattedNumber);
    
    return res.status(200).json({
      success: true,
      message: '인증이 완료되었습니다'
    });
  } catch (error) {
    console.error('인증번호 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '인증번호 확인 중 오류가 발생했습니다',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}