import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { Request, Response } from "express";
import { storage } from "./storage";
import { db, pool } from "./db";
import { plants } from "../shared/schema";

// Gemini AI 설정
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

// 안전 설정
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// 식물 추천 및 상담을 위한 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 PlanB 서비스의 식물 전문 상담사입니다. 사용자가 식물을 선택하는 것을 돕고 그들의 환경과 목적에 맞는 식물을 추천합니다.

대화 가이드:
1. 첫 메시지 기본 템플릿: "안녕하세요? 🌱 당신의 식물생활을 도울 인공지능 심다입니다. 어떤 목적으로 식물을 찾고 계신가요? (실내 장식, 공기 정화, 선물 등) 알려주시면 맞춤 추천을 해드릴게요! 😊"
   - 중요: 사용자가 "AI 추천으로 진행할게요"라고 하면 반드시 위 템플릿과 같이 첫 질문으로 목적을 물어봐야 합니다.
   - 환경 관련 질문 (빛, 공간 등)은 절대 첫 질문으로 하지 마세요. 반드시 목적을 먼저 물어봐야 합니다.
   - 사용자가 "공기정화" 등 목적을 이미 언급했다면, 다음 단계 질문으로 바로 넘어가세요.

2. 매우 중요 - 절대적 규칙: 반드시 5개의 질문을 순서대로 완료한 후에만 식물을 추천하세요:
   1단계) 식물을 찾는 목적 (장식, 공기정화, 선물 등) - 첫 번째 질문
   2단계) 키울 공간의 밝기 (직사광선, 간접광, 그늘) - 두 번째 질문  
   3단계) 공간의 크기와 위치 (넓은 공간, 작은 공간, 책상 위, 선반 등) - 세 번째 질문
   4단계) 관리 난이도 선호도 (초보자용, 경험자용) - 네 번째 질문
   5단계) 추가 선호사항 (꽃이 피는 식물, 잎이 큰 식물, 색상 등) - 다섯 번째이자 마지막 질문

3. 절대적 단계 제어:
   - 현재 몇 단계인지 정확히 추적하세요. 1~4단계에서는 절대로 식물을 추천하지 마세요.
   - 5단계가 모두 완료되기 전까지는 "아직 더 알아봐야 할 것이 있어요!" 라고 말하며 다음 질문을 계속하세요.
   - 사용자가 "추천해줘", "보여줘", "빨리 해줘" 등 어떤 요청을 해도 5단계 완료 전에는 절대 식물을 추천하지 마세요.
   - 각 답변 후 반드시 다음 단계 질문으로 넘어가세요.
   - 한 번에 여러 질문을 하지 말고, 오직 하나의 질문만 하세요.

4. 사용자가 5단계 모두 완료하고 충분한 정보를 제공했을 때만 식물 추천:
   - 사용자의 요구에 맞는 3-5개의 식물을 추천합니다.
   - 각 식물에 대한 기본 정보, 관리 방법, 가격대를 포함합니다.
   - 추천하는 식물은 반드시 PlantBid 데이터베이스에 등록된 식물 목록에서만 선택하세요.
   - 다음 4개 카테고리의 모든 식물을 활용할 수 있습니다:
     ✓ 내부 식물 목록 (사용자 등록 식물)
     ✓ 공기정화식물 64종 (농촌진흥청 공식 데이터)
     ✓ 건조에 강한 실내식물 97종 (농사로 포털 공식 데이터)
     ✓ 실내정원용 식물 217종 (농사로 포털 공식 데이터)
   - 총 350종 이상의 다양한 식물 중에서 사용자 환경에 최적화된 추천을 제공하세요.
   - 각 식물의 생육 정보와 관리 방법은 당신의 전문 지식을 활용하여 정확한 정보를 제공하세요.

4. 대화 스타일:
   - 매우 친근하고 밝은 톤으로 대화하세요. 
   - 이모티콘을 적절히 사용하여 친근함을 더해주세요 (🌱, 🌿, 🌵, 💦, 🌞, 💚 등).
   - 짧고 읽기 쉬운 문장을 사용해 대화하세요.
   - 따뜻함과 공감을 표현하는 말을 자주 사용하세요.
   - 식물을 추천할 때는 마치 친구에게 추천하는 것처럼 설명해주세요.

5. 답변 지침:
   - 질문에 즐겁고 활기찬 어조로 답변하세요.
   - 사용자의 상황에 공감하며 개인화된 추천을 해주세요.
   - 식물 관리에 자신감을 줄 수 있도록 긍정적인 표현을 사용하세요.
   - 전문용어보다는 일상적인 언어를 사용하세요.

최종 응답은 아래 JSON 포맷으로 동시에 제공해야 합니다:

{
  "content": "사용자에게 보여줄 메시지 내용",
  "recommendations": [
    {
      "name": "식물 이름",
      "description": "간단한 설명 (친근하고 긍정적인 어조로)",
      "careInstructions": "관리 방법 (초보자도 이해하기 쉽게)",
      "priceRange": "가격대 (예: 10,000원~30,000원)"
    }
  ]
}

절대적 규칙: 
- 1~4단계에서는 반드시 recommendations 배열을 비워두세요: "recommendations": []
- 5단계가 완료된 후에만 식물을 추천하세요
- 사용자가 어떤 요청을 해도 5단계 완료 전에는 절대 식물을 추천하지 마세요
- 현재 대화 기록을 분석해서 몇 단계까지 완료되었는지 정확히 파악하세요
- 반드시 정해진 식물 목록 중에서만 선택하여 추천해주세요

단계 확인 방법:
1단계 완료: 사용자가 목적을 답했는가? (실내장식, 공기정화, 선물 등)
2단계 완료: 사용자가 밝기를 답했는가? (직사광선, 간접광, 그늘)
3단계 완료: 사용자가 공간을 답했는가? (넓은/작은 공간, 책상/선반 등)
4단계 완료: 사용자가 난이도를 답했는가? (초보자용, 경험자용)
5단계 완료: 사용자가 선호사항을 답했는가? (꽃, 잎 크기, 색상 등)

모든 5단계가 완료되기 전까지는 절대로 식물을 추천하지 마세요.`;

// 대화 내용을 저장하기 위한 인터페이스
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  recommendations?: any[];
  imageUrl?: string; // 참고 이미지 URL
}

// 대화 컨텍스트에서 사용자의 식물 선호도를 분석하는 함수
async function analyzePlantPreferences(chatHistory: ChatMessage[], userMessage: string): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // 대화 내역을 기준으로 식물 추천 요청 생성
    console.log("Analyzing plant preferences for recommendation...");
    
    // 최근 10개 메시지만 사용
    const recentHistory = chatHistory.slice(-10);
    
    // 대화 단계 확인 - 충분한 질문이 진행되었는지 확인
    if (recentHistory.length < 10) { // 사용자와 AI 메시지를 번갈아가며 주고받으므로 최소 5번의 교환이면 10개 메시지
      console.log("대화 단계가 충분하지 않음 - 추천 대신 다음 질문 진행:", recentHistory.length);
      
      // 현재 대화 상태를 파악하여 다음 질문 결정
      let nextQuestionPrompt = `
        당신은 식물 추천 전문가입니다. 아래 대화를 분석하고, 다음 단계의 질문을 해주세요.
        
        대화는 반드시 다음 5단계의 질문을 순서대로 진행해야 합니다:
        1. 식물을 찾는 목적 (예: 실내 장식, 공기정화, 선물 등)
        2. 키울 공간의 밝기 (직사광선, 간접광, 그늘 등)
        3. 공간의 크기와 위치 (넓은 공간, 작은 공간, 책상 위, 선반 등)
        4. 관리 난이도 선호도 (초보자용, 경험자용)
        5. 추가 선호사항 (꽃이 피는 식물, 잎이 큰 식물, 색상 등)
        
        현재 대화 내용:
        ${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
        
        사용자의 마지막 메시지: ${userMessage}
        
        지금까지의 대화를 분석하여, 아직 물어보지 않은 다음 단계의 질문을 JSON 형식으로 응답하세요. 이모티콘과 친근한 표현을 사용해서 따뜻한 어조로 응답하세요.
        
        {
          "content": "다음 단계 질문 내용 (친근하고 공감하는 표현으로)",
          "recommendations": []
        }
      `;
      
      const nextQuestionResult = await model.generateContent(nextQuestionPrompt);
      const nextQuestionResponse = await nextQuestionResult.response;
      const nextQuestionText = nextQuestionResponse.text();
      
      // 응답에서 JSON 추출
      try {
        const data = extractJsonFromText(nextQuestionText);
        // 명시적으로 recommendations를 빈 배열로 설정
        data.recommendations = [];
        return data;
      } catch (e) {
        return {
          content: nextQuestionText.replace(/```json|```/g, '').trim(),
          recommendations: []
        };
      }
    }
    
    // 대화가 충분히 진행되었으면 식물 추천 진행
    console.log("충분한 대화 단계 진행됨 - 식물 추천 진행");
    
    // 1. 실제 식물 데이터 가져오기
    console.log("실제 식물 목록을 가져오는 중...");
    const availablePlants = await getAllPlantNames();
    console.log(`총 ${availablePlants.length}개의 식물을 데이터베이스에서 가져왔습니다.`);
    
    // 2. 사용자 메시지 분석 및 추천
    let prompt = `
      당신은 한국어로 소통하는 식물 전문가입니다. 사용자의 메시지를 분석하여 식물 선호도와 환경 조건을 파악하세요.
      그리고 다음 형식으로 반드시 유효한 JSON 응답을 생성해주세요:
      
      {
        "content": "사용자 질문에 대한 응답 텍스트 (JSON이나 코드블록에 대한 언급은 하지 말고 자연스러운 대화체로 작성하세요)",
        "recommendations": [
          {
            "name": "식물 이름",
            "description": "식물 설명 (특징, 장점 등) - 각 식물마다 고유한 설명을 작성하세요",
            "careInstructions": "관리 방법 - 각 식물마다 고유한 관리법을 작성하세요",
            "priceRange": "가격 범위 (예: 10,000원~30,000원)"
          }
        ]
      }
      
      **🚨 절대적 제약사항: 추천하는 식물은 반드시 아래 목록에서만 선택하세요 🚨**
      
      **허용된 식물 목록 (총 ${availablePlants.length}개 - 전체 목록):**
      ${availablePlants.join(', ')}
      
      **⚠️ 경고: "바나나"라는 식물은 존재하지 않습니다! "바나나크로톤", "왜성바나나"만 사용하세요!**
      
      **총 ${availablePlants.length}개의 식물 중에서 사용자 조건에 가장 적합한 3-5개를 선택하세요.**
      
      **🔒 엄격한 규칙:**
      1. ❌ 위 목록에 없는 식물은 절대 추천하지 마세요 (예: "바나나" 금지!)
      2. ✅ 식물 이름은 위 목록의 정확한 이름으로만 작성하세요
      3. 🎯 각 식물마다 고유한 설명과 관리법을 작성하세요
      4. 💬 사용자에게는 자연스러운 대화체로 응답하세요
      5. 📋 대화 이력의 사용자 조건을 모두 반영하세요
      6. 🌱 정확한 식물 관리 정보를 제공하세요
      
      현재 대화 내용:
      ${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
      
      사용자 메시지: ${userMessage}
    `;
    
    // 응답 생성
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Plant preferences analysis - Raw AI response:", text);
    
    // 응답에서 JSON 추출
    const data = extractJsonFromText(text);
    
    // 식물 이미지 추가
    if (data.recommendations && data.recommendations.length > 0) {
      const enrichedRecommendations = await enrichRecommendationsWithImages(data.recommendations);
      data.recommendations = enrichedRecommendations;
    }
    
    return data;
  } catch (error) {
    console.error("Error analyzing plant preferences:", error);
    return {
      content: "식물 추천 중 오류가 발생했습니다. 다시 시도해주세요.",
      recommendations: []
    };
  }
}

// 데이터베이스와 외부 API에서 모든 식물 이름 가져오기
async function getAllPlantNames(): Promise<string[]> {
  try {
    const allPlantNames = new Set<string>();
    
    // 1. 내부 식물 데이터베이스에서 가져오기
    const internalResult = await pool.query(`SELECT name FROM plants ORDER BY name`);
    internalResult.rows.forEach((row: any) => {
      if (row.name) allPlantNames.add(row.name.trim());
    });
    
    // 2. 공기정화식물 API 데이터 가져오기 (64종)
    try {
      const airResponse = await fetch('http://localhost:5000/api/admin/external-plants/air-purifying-new-64');
      if (airResponse.ok) {
        const airXml = await airResponse.text();
        const airPlants = parseAirPurifyingXML(airXml);
        airPlants.forEach(plant => {
          if (plant.title) allPlantNames.add(plant.title.trim());
        });
      }
    } catch (error) {
      console.error('공기정화식물 데이터 가져오기 오류:', error);
    }
    
    // 3. 건조에 강한 식물 API 데이터 가져오기 (97종)
    try {
      const dryResponse = await fetch('http://localhost:5000/api/admin/external-plants/dry-garden');
      if (dryResponse.ok) {
        const dryXml = await dryResponse.text();
        const dryPlants = parseDryGardenXML(dryXml);
        dryPlants.forEach(plant => {
          if (plant.cntntsSj) allPlantNames.add(plant.cntntsSj.trim());
        });
      }
    } catch (error) {
      console.error('건조에 강한 식물 데이터 가져오기 오류:', error);
    }
    
    // 4. 실내정원용 식물 API 데이터 가져오기 (217종)
    try {
      const indoorResponse = await fetch('http://localhost:5000/api/admin/external-plants/indoor-garden');
      if (indoorResponse.ok) {
        const indoorXml = await indoorResponse.text();
        const indoorPlants = parseIndoorGardenXML(indoorXml);
        indoorPlants.forEach(plant => {
          if (plant.cntntsSj) allPlantNames.add(plant.cntntsSj.trim());
        });
      }
    } catch (error) {
      console.error('실내정원용 식물 데이터 가져오기 오류:', error);
    }
    
    console.log(`총 ${allPlantNames.size}개의 식물 이름을 수집했습니다.`);
    return Array.from(allPlantNames).sort();
  } catch (error) {
    console.error('식물 이름 가져오기 오류:', error);
    return [];
  }
}

// XML 파싱 함수들
function parseAirPurifyingXML(xmlString: string): any[] {
  try {
    const DOMParser = require('@xmldom/xmldom').DOMParser;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const results = xmlDoc.getElementsByTagName('result');
    
    const plants = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const title = result.getElementsByTagName('title')[0]?.textContent;
      if (title) {
        plants.push({ title: title.replace(/\([^)]*\)/g, '').trim() });
      }
    }
    return plants;
  } catch (error) {
    console.error('공기정화식물 XML 파싱 오류:', error);
    return [];
  }
}

function parseDryGardenXML(xmlString: string): any[] {
  try {
    const DOMParser = require('@xmldom/xmldom').DOMParser;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const items = xmlDoc.getElementsByTagName('item');
    
    const plants = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cntntsSj = item.getElementsByTagName('cntntsSj')[0]?.textContent;
      if (cntntsSj) {
        plants.push({ cntntsSj: cntntsSj.trim() });
      }
    }
    return plants;
  } catch (error) {
    console.error('건조에 강한 식물 XML 파싱 오류:', error);
    return [];
  }
}

function parseIndoorGardenXML(xmlString: string): any[] {
  try {
    const DOMParser = require('@xmldom/xmldom').DOMParser;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    const items = xmlDoc.getElementsByTagName('item');
    
    const plants = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cntntsSj = item.getElementsByTagName('cntntsSj')[0]?.textContent;
      if (cntntsSj) {
        plants.push({ cntntsSj: cntntsSj.trim() });
      }
    }
    return plants;
  } catch (error) {
    console.error('실내정원용 식물 XML 파싱 오류:', error);
    return [];
  }
}

// 식물 이름에 해당하는 이미지 URL 가져오기
async function getPlantImageUrl(plantName: string): Promise<string> {
  try {
    const result = await pool.query('SELECT image_url FROM plants WHERE name = $1', [plantName]);
    
    if (result.rows.length > 0 && result.rows[0].image_url) {
      return result.rows[0].image_url;
    }
    
    // 기본 이미지 반환
    return '/assets/plants/default-plant.png';
  } catch (error) {
    console.error('식물 이미지 가져오기 오류:', error);
    return '/assets/plants/default-plant.png';
  }
}

// Gemini가 생성한 추천 식물에 구글 이미지 검색을 위한 정보 추가
async function enrichRecommendationsWithImages(recommendations: any[]): Promise<any[]> {
  if (!recommendations || recommendations.length === 0) {
    return [];
  }
  
  console.log(`AI 추천 식물 개수: ${recommendations.length}`);
  
  // 각 추천 항목에 구글 검색 URL 추가 (데이터베이스 대신 직접 구글 검색 사용)
  const enrichedRecommendations = recommendations.map(recommendation => {
    // 구글 이미지 검색 URL 구성
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(recommendation.name)}+식물&tbm=isch`;
    
    // 완전히 데이터베이스와 분리된 추천 구성
    return {
      name: recommendation.name,
      description: recommendation.description,
      careInstructions: recommendation.careInstructions,
      priceRange: recommendation.priceRange,
      // 이후에 클라이언트에서 구글 이미지 검색 API를 활용하게 함
      searchTerm: recommendation.name
    };
  });
  
  return enrichedRecommendations;
}

export async function handleChatMessage(req: Request, res: Response) {
  try {
    const { message, conversationId, userId, imageUrl, mode } = req.body;
    
    // 사용자 검증
    if (!userId && !req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // 클라이언트에서 전달된 모드 로깅 - 디버깅 및 상태 파악용
    console.log(`AI 채팅 모드: ${mode || 'default'}, 메시지: ${message.substring(0, 30)}...`);
    
    // 결제 완료 상태에서 관리법 문의일 경우만 특별 대응
    const isManagementQuery = message.includes('관리') || 
                              message.includes('돌보') || 
                              message.includes('키우') || 
                              message.includes('방법') ||
                              message.includes('알려줘');
                              
    const isPurchaseComplete = mode === 'payment-complete';
    
    // 특별 응답이 필요한 경우 (결제 완료 상태에서 관리법 문의 등)
    const needsSpecialResponse = isPurchaseComplete && isManagementQuery;
    
    // 디버깅
    console.log(`상태 정보 - 모드: ${mode}, 관리 문의: ${isManagementQuery}, 특별 응답 필요: ${needsSpecialResponse}`);
    
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      safetySettings,
    });
    
    // 기존 대화 조회 또는 새 대화 생성
    let conversation;
    let chatHistory: ChatMessage[] = [];
    
    if (conversationId) {
      conversation = await storage.getConversation(conversationId);
      if (conversation && conversation.messages) {
        // 데이터베이스에서 불러온 메시지의 타임스탬프를 Date 객체로 변환
        chatHistory = (conversation.messages as any[]).map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          recommendations: msg.recommendations || [],
          imageUrl: msg.imageUrl // 이미지 URL 추가
        }));
      }
    }
    
    // 대화 형식에 맞게 변환하여 Gemini에 전달
    // 최근에는 system 역할도 지원하기 시작함
    // 첫 번째 메시지는 항상 시스템 프롬프트로 전달
    console.log("Current chat history length:", chatHistory.length);
    
    // 기본 시스템 프롬프트 설정
    let modifiedSystemPrompt = SYSTEM_PROMPT;
    
    // 특별 응답이 필요한 경우 (결제 완료 상태에서 관리법 문의 등)
    if (needsSpecialResponse) {
      console.log("결제 완료 후 식물 관리 문의 감지 - 특별 프롬프트 추가");
      modifiedSystemPrompt += `\n\n사용자가 방금 식물을 구매했고 결제를 완료했습니다. 
      사용자가 식물 관리 방법에 대해 물어보고 있으니 상세한 관리 방법을 친절하게 안내해주세요.
      구매를 축하하고, 식물 관리에 대한 기본적인 조언과 함께 상세한 관리법을 설명해주세요.`;
    }
    
    // 지역 상점 모드일 때도 특별 프롬프트 적용
    if (mode === 'region-store' && isManagementQuery) {
      console.log("지역 상점 모드에서 식물 관리 문의 감지 - 상태 유지하면서 응답");
      modifiedSystemPrompt += `\n\n사용자가 지역 상점을 살펴보는 중이지만 식물 관리에 대해 문의하고 있습니다.
      상점 정보를 계속 표시하면서 친절하게 식물 관리 방법을 안내해주세요.`;
    }
    
    const chatMessages = [
      { role: "user", parts: [{ text: modifiedSystemPrompt }] }
    ];
    
    // 최근 대화 이력 추가 (최대 20개 메시지만 사용)
    // 너무 많은 메시지는 context window 한계로 문제 발생 가능성 있음
    const recentHistory = chatHistory.slice(-20);
    
    // 각 메시지를 Gemini API 형식으로 변환하여 추가 (빈 메시지 필터링)
    recentHistory.forEach(msg => {
      // 컨텐츠가 있고 비어있지 않은 메시지만 추가
      if (msg.content && msg.content.trim()) {
        chatMessages.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }
    });
    
    console.log("Prepared chat messages for Gemini:", chatMessages.length);
    
    // Gemini API 호출
    const chat = model.startChat({
      history: chatMessages,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });
    
    // 빈 메시지 검사 및 기본값 설정
    const messageText = message && message.trim() ? message : "안녕하세요. 계속해서 도와드릴게요.";
    const result = await chat.sendMessage([{ text: messageText }]);
    const response = await result.response;
    const responseText = response.text();
    
    let parsedResponse;
    try {
      // JSON 응답 파싱 시도
      parsedResponse = extractJsonFromText(responseText);
    } catch (error) {
      // JSON 파싱에 실패한 경우 기본 형식으로 변환
      parsedResponse = {
        content: responseText,
        recommendations: []
      };
    }
    
    // 사용자 메시지에서 식물 선호도 분석하여 추천 목록 가져오기
    let recommendationData = await analyzePlantPreferences(chatHistory, message);
    
    // 만약 preferences에서 받은 데이터가 유효하고 추천이 있으면 해당 데이터로 대체
    if (recommendationData && recommendationData.recommendations && 
        recommendationData.recommendations.length > 0 && 
        Array.isArray(recommendationData.recommendations)) {
      // parsedResponse를 분석된 추천 데이터로 대체
      parsedResponse = recommendationData;
    }
    
    // 사용자가 충분한 정보를 제공했다면 추천 시작
    // 대화 맥락을 분석하여 추천이 필요한 시점인지 판단
    // 최소 5개의 메시지 교환(질문/답변) 후에만 추천 시작, 또는 사용자가 명시적으로 요청한 경우
    const messageCount = chatHistory.length;
    const hasExplicitRequest = message.includes('추천') || 
                               message.includes('보여줘') || 
                               message.includes('알려줘') ||
                               message.includes('식물') || 
                               message.includes('뭐가 좋을까') ||
                               message.includes('찾고 있') ||
                               message.includes('알려주') ||
                               message.includes('보여주');
                                
    // AI가 사용자와의 대화에서 충분한 정보를 수집했는지 판단
    
    // 이전에 이미 추천 내용이 있었는지 확인
    const hasExistingRecommendations = chatHistory.some(msg => 
      msg.recommendations && msg.recommendations.length > 0
    );
    
    // 충분한 대화 교환이 이루어졌는지 확인 (최소 5번의 질문-응답 교환 후 추천)
    const hasEnoughConversation = messageCount >= 10; // 사용자와 AI 메시지를 합쳐 최소 10개 이상
    
    // 사용자가 강하게 요청했는지 확인 (추천해줘, 보여줘 등 직접적인 요청)
    const hasStrongRequest = message.includes('추천해') || 
                            message.includes('보여줘') || 
                            message.includes('알려줘');
    
    // 대화 내용에서 각 단계 키워드 검색 (AI 질문과 사용자 응답 모두 검색)
    // 더 간단하고 확실한 방식으로 구현
    const stageKeywords = [
      ["목적", "용도", "왜", "원해", "찾고", "필요"], // 1단계: 목적/용도
      ["햇빛", "밝기", "빛", "환하", "창가", "직사광선", "그늘"], // 2단계: 햇빛/밝기
      ["공간", "위치", "놓", "두", "크기", "책상", "선반", "거실", "방"], // 3단계: 공간/위치
      ["난이도", "관리", "초보", "키우기", "경험", "쉬운", "어려운", "물"], // 4단계: 난이도/관리
      ["선호", "색상", "종류", "스타일", "마음에", "특별히", "꽃", "잎", "생김새"] // 5단계: 선호/스타일
    ];
    
    // 각 단계별로 키워드가 대화에 포함되어 있는지 확인
    let stageCount = 0;
    
    // 전체 대화 내용에서 단계별로 키워드 검색
    const allMessages = recentHistory.map(msg => msg.content.toLowerCase());
    const allContent = allMessages.join(' ');
    
    // 각 단계별 키워드 검색
    for (const stageKeywordList of stageKeywords) {
      // 해당 단계의 키워드가 하나라도 있는지 확인
      const hasKeyword = stageKeywordList.some(keyword => 
        allContent.includes(keyword)
      );
      
      if (hasKeyword) {
        stageCount++;
      }
    }
    
    // 디버깅 정보
    console.log("단계별 키워드 검색 결과: ", stageCount);
    
    console.log("대화 단계 진행 상태:", stageCount, "/ 5");
    
    // 더 엄격한 5단계 완료 확인: 반드시 5단계를 모두 완료해야 함
    const has5StepsCompleted = stageCount >= 5;
    
    // 사용자의 명시적인 요청이 있어도 5단계가 완료되지 않았으면 추천하지 않음
    console.log("엄격한 5단계 완료 확인 - 완료된 단계:", stageCount, "추천 가능:", has5StepsCompleted);
    
    console.log("메시지 개수:", messageCount, "5단계 완료 여부:", has5StepsCompleted);
    
    // 추천 조건: 5단계 질문이 완료되었거나 이미 추천이 있는 경우만 추천
    const shouldRecommend = 
      hasExistingRecommendations || // 이미 추천이 있었다면 계속 추천
      has5StepsCompleted; // 메시지가 6개 이상이고 5단계 질문이 모두 완료된 경우
    
    // 데이터베이스의 실제 식물 이름 목록 가져오기
    const plantNames = await getAllPlantNames();
    
    // 제거된 recommendPlantsFromDatabase 함수 대신 새로운 로직으로 추천
    if (shouldRecommend) {
      // Gemini가 추천한 식물들을 사용
      if (parsedResponse.recommendations && parsedResponse.recommendations.length > 0) {
        // Gemini 추천 식물에 이미지 URL 추가 (실제 식물 데이터베이스에서 매칭)
        parsedResponse.recommendations = await enrichRecommendationsWithImages(parsedResponse.recommendations);
      } else {
        // 추천이 필요하지만 AI가 추천을 하지 않은 경우 (드문 경우)
        // 랜덤으로 3개 식물 선택
        const randomPlants = await pool.query(`SELECT name, image_url FROM plants ORDER BY RANDOM() LIMIT 3`);
        
        if (randomPlants.rows.length > 0) {
          parsedResponse.recommendations = randomPlants.rows.map((plant: any) => {
            return {
              name: plant.name,
              description: `${plant.name}은(는) 특별한 실내식물입니다. ${
                Math.random() > 0.5 ? 
                "뛰어난 공기정화 능력이 있으며 집안의 분위기를 산뜻하게 만들어줍니다." : 
                "아름다운 잎 모양과 독특한 생김새로 인테리어 효과가 탁월합니다."
              } 🌱`,
              careInstructions: plant.name.includes("선인장") || plant.name.includes("다육식물") ?
                "건조한 환경을 선호하며 과습에 주의하세요. 한 달에 한 번 정도 물을 주는 것이 좋습니다." :
                plant.name.includes("야자") || plant.name.includes("고사리") ?
                "습한 환경을 좋아하며 일주일에 한 번 정도 물을 주고, 잎에 분무를 해주면 좋습니다." :
                "적당한 밝기의 간접광을 좋아하며 흙이 마르면 충분히 물을 주세요. 과습과 과건조에 주의하세요.",
              priceRange: "15,000원~30,000원",
              imageUrl: plant.image_url || '/assets/plants/default-plant.png'
            };
          });
          
          parsedResponse.content += "\n\n아래 식물들도 추천해 드릴게요! 마음에 드는 식물이 있으면 선택해주세요. 🌿";
        }
      }
    } else {
      // 아직 추천 단계가 아니라면 빈 배열로 설정
      parsedResponse.recommendations = [];
    }
    
    // 새 메시지 생성
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
      imageUrl: imageUrl // 이미지 URL 추가
    };
    
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: parsedResponse.content,
      timestamp: new Date(),
      recommendations: parsedResponse.recommendations || []
    };
    
    // 대화 저장 또는 업데이트
    let newConversationId = conversationId;
    if (!conversation) {
      // 새 대화 생성
      const newConversation = await storage.createConversation({
        userId: userId || (req.user?.id as number),
        messages: [userMessage, assistantMessage].map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString() // Date를 string으로 변환
        })),
        plantRecommendations: parsedResponse.recommendations || [],
        status: "active"
      });
      newConversationId = newConversation.id;
    } else {
      // 기존 대화 업데이트
      const updatedMessages = [...chatHistory, userMessage, assistantMessage].map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      await storage.updateConversation(conversationId, updatedMessages, parsedResponse.recommendations || []);
    }
    
    // 클라이언트에 응답
    res.status(200).json({
      conversationId: newConversationId,
      content: parsedResponse.content,
      recommendations: parsedResponse.recommendations || [],
      timestamp: new Date()
    });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "Failed to process AI chat message" });
  }
}

// 텍스트에서 JSON 추출 함수
function extractJsonFromText(text: string) {
  try {
    // 전체 텍스트가 JSON인지 확인
    return JSON.parse(text);
  } catch (e) {
    // 코드 블록 내부의 JSON 또는 전체 텍스트가 JSON인 경우 찾기
    const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                      text.match(/```([\s\S]*?)```/) ||
                      text.match(/{[\s\S]*"recommendations"[\s\S]*?}/);
    
    if (jsonMatch) {
      try {
        const jsonContent = jsonMatch[1] || jsonMatch[0];
        
        // 더 강력한 JSON 형식 정리
        let cleanedJson = jsonContent;
        
        // 1. 따옴표 표준화 (키와 문자열 값 모두에 대해)
        cleanedJson = cleanedJson
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')  // 키를 쌍따옴표로 감싸기
          .replace(/'/g, '"');  // 작은따옴표를 큰따옴표로 변경
          
        // 2. 따옴표 누락 수정 시도 (JSON 값 주변의 따옴표 확인)
        cleanedJson = cleanedJson
          .replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)\s*([,}])/g, ':"$1"$2'); // 따옴표 없는 문자열 값 수정
          
        // 3. 후행 쉼표 제거 (JSON에서 오류 발생 가능)
        cleanedJson = cleanedJson
          .replace(/,\s*}/g, '}')
          .replace(/,\s*\]/g, ']');
        
        // 디버깅을 위한 로그
        console.log("원본 JSON 텍스트:", jsonContent.substring(0, 100) + "...");
        console.log("정리된 JSON 텍스트:", cleanedJson.substring(0, 100) + "...");
          
        // JSON 파싱
        const parsed = JSON.parse(cleanedJson);
        
        console.log("Successfully parsed JSON from AI response");
        return parsed;
      } catch (innerError) {
        console.error("JSON parsing error:", innerError);
        console.error("Attempted to parse:", jsonMatch[1] || jsonMatch[0]);
      }
    }
    
    // JSON이 없거나 파싱에 실패한 경우 기본 형식 반환
    return {
      content: text,
      recommendations: []
    };
  }
}