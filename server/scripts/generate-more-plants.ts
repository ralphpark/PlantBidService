import { db } from "../db";
import { plants } from "../../shared/schema";

// 식물 생성을 위한 기본 데이터
const plantNames = [
  "가시아니스", "관음죽", "관엽베고니아", "구구꽃다리", "구문초", "구아바", "관우엽란", "귀한란", "국화", "군자란",
  "글록시니아", "금계국", "금낭화", "금련화", "금목서", "금어초", "금전수", "금지란", "금천로", "금천조", 
  "기린초", "꽃담배", "꽃베고니아", "꽃양배추", "꽃향유", "나도풍란", "나도히어리", "나루시스", "나무수국",
  "나한송", "난초", "남성", "네마탄서스", "네오레겔리아", "노란꽃창포", "녹영", "눈향나무", "뉴질랜드삼나무",
  "달개비", "닭의장풀", "덕구라미", "데침시아", "도금양", "동백나무", "둥근잎천남성", "들메꽃", "디기탈리스",
  "라난큘러스", "라일락", "라임", "레몬", "로베리아", "루드베키아", "루이보스", "루토리소", "리시안서스",
  "마가렛", "마삭줄", "마조람", "마트리카리아", "만병초", "만수국", "맥문동", "매리골드", "메리퀸", "모란",
  "무화과", "물망초", "미모사", "미스티블루", "바위솔", "밤꽃나무", "밸로타", "백당나무", "백량금", "백리향",
  "백합", "버들", "베고니아", "보리수나무", "복숭아", "봄맞이", "봄출혈", "부처꽃", "불두화", "붓꽃", 
  "사과나무", "사철란", "사철채송화", "산울량", "산수유", "삼색조팝", "삽주", "새우란", "생강나무", "석죽",
  "석창포", "선덕취", "선인장", "설앵초", "세렝게티", "세이지", "소나무", "솔리다고", "스노드롭", "스타티스"
];

const scientificNames = [
  "Abelia", "Abies", "Abutilon", "Acacia", "Acalypha", "Acanthus", "Acer", "Achillea", "Acorus", "Actinidia",
  "Adiantum", "Aechmea", "Aegopodium", "Aesculus", "Agapanthus", "Agave", "Ageratum", "Ajuga", "Akebia", "Alchemilla"
];

const descriptions = [
  "화려한 꽃잎이 특징인 실내 관상용 식물입니다.",
  "새하얀 꽃이 인상적인 선물용으로 적합한 식물입니다.",
  "공기정화 능력이 탁월한 실내 식물로 인기가 많습니다.",
  "특이한 잎 모양이 독특하여 인테리어 효과가 좋은 식물입니다.",
  "초보자도 쉽게 키울 수 있는 관리가 쉬운 실내식물입니다.",
  "다양한 색상의 잎이 아름다운 관상용 식물입니다.",
  "열대 분위기를 연출할 수 있는 이국적인 식물입니다.",
  "한국의 전통 가정에서 사랑받는 장수와 행운의 상징 식물입니다.",
  "선물용으로 인기가 많은 꽃이 아름다운 식물입니다.",
  "작은 크기로 책상이나 선반 장식에 적합한 식물입니다."
];

const careInstructions = [
  "직사광선을 피하고 2-3주에 한 번 물을 주세요. 과습에 약합니다.",
  "밝은 간접광에서 잘 자라며 흙이 마르면 물을 주세요. 습도가 높은 환경을 선호합니다.",
  "간접광에서 잘 자라며 일주일에 한 번 정도 물을 주세요. 겨울에는 물주기를 줄이세요.",
  "햇빛이 풍부한 곳에서 키우고 2-3일에 한 번 물을 주세요. 통풍이 잘 되는 환경이 좋습니다.",
  "낮은 조도에서도 잘 자라며 흙이 마르면 물을 주세요. 과습에 약하니 주의하세요.",
  "햇빛이 잘 드는 환경에서 키우고 흙이 마르면 충분히 물을 주세요. 겨울에는 물주기를 줄이세요.",
  "간접광을 좋아하며 토양이 마르면 물을 주세요. 습도가 높은 환경에서 잘 자랍니다.",
  "밝은 곳에서 잘 자라며 1-2주에 한 번 물을 주세요. 겨울에는 물 주기를 줄이세요.",
  "직사광선은 피하고 물은 흙이 완전히 마르면 주세요. 과습에 매우 약합니다."
];

const categories = ["실내식물", "꽃식물", "공기정화식물", "선물용", "관상용식물", "다육식물", "허브", "행운식물"];
const difficulties = ["초보자", "중급자", "전문가"];
const lightConditions = ["직사광선", "간접광", "밝은 간접광", "낮은 조도", "반음지"];
const waterNeeds = ["적음", "중간", "높음"];

// 랜덤 식물 데이터 생성 함수
function generateRandomPlant() {
  const name = plantNames[Math.floor(Math.random() * plantNames.length)];
  const scientificName = scientificNames[Math.floor(Math.random() * scientificNames.length)];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  const careInstruction = careInstructions[Math.floor(Math.random() * careInstructions.length)];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
  const light = lightConditions[Math.floor(Math.random() * lightConditions.length)];
  const waterNeed = waterNeeds[Math.floor(Math.random() * waterNeeds.length)];
  const minPrice = Math.floor(Math.random() * 20 + 5) * 1000;
  const maxPrice = minPrice + Math.floor(Math.random() * 30 + 10) * 1000;
  
  return {
    name,
    scientificName: `${scientificName} ${name.toLowerCase()}`,
    description,
    careInstructions: careInstruction,
    priceRange: `${minPrice}원~${maxPrice}원`,
    category,
    difficulty,
    light,
    waterNeeds: waterNeed,
    imageUrl: `https://example.com/plants/${encodeURIComponent(name)}.jpg`
  };
}

async function generateAndAddPlants() {
  try {
    // 추가 전 확인
    const beforePlants = await db.select().from(plants);
    console.log(`기존 식물 데이터: ${beforePlants.length}개`);
    
    // 랜덤 식물 생성 (중복 이름 제외)
    const existingNames = new Set(beforePlants.map(p => p.name));
    const randomPlants = [];
    
    // 100개의 랜덤 식물 데이터 생성
    for (let i = 0; i < 100; i++) {
      const plant = generateRandomPlant();
      if (!existingNames.has(plant.name)) {
        randomPlants.push(plant);
        existingNames.add(plant.name);
      }
    }
    
    console.log(`생성된 랜덤 식물 데이터: ${randomPlants.length}개`);
    
    // 분할하여 데이터 삽입
    const chunkSize = 20;
    for (let i = 0; i < randomPlants.length; i += chunkSize) {
      const chunk = randomPlants.slice(i, i + chunkSize);
      await db.insert(plants).values(chunk).returning();
      console.log(`${i + 1}~${Math.min(i + chunkSize, randomPlants.length)}개 데이터 삽입 완료`);
    }
    
    // 추가 후 확인
    const afterPlants = await db.select().from(plants);
    console.log(`총 식물 데이터: ${afterPlants.length}개`);
    
  } catch (error) {
    console.error("식물 데이터 생성 및 추가 중 오류 발생:", error);
  } finally {
    process.exit(0);
  }
}

generateAndAddPlants();