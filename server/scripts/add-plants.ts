import { db } from "../db";
import { plants } from "../../shared/schema";

// 추가 식물 데이터
const morePlants = [
  {
    name: "알로카시아",
    scientificName: "Alocasia",
    description: "큰 잎이 특징적인 열대 식물로, 실내 장식용으로 인기가 많습니다.",
    careInstructions: "간접광에서 키우고 흙이 마르면 물을 주세요. 고온다습한 환경을 선호합니다.",
    priceRange: "20,000원~60,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/alocasia.jpg"
  },
  {
    name: "고무나무",
    scientificName: "Ficus elastica",
    description: "실내에서 키우기 쉬운 대표적인 관엽식물로, 공기정화 효과가 있습니다.",
    careInstructions: "밝은 간접광을 좋아하며 물은 흙이 마르면 주세요. 위치 변경에 민감합니다.",
    priceRange: "15,000원~50,000원",
    category: "공기정화식물",
    difficulty: "초보자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/ficus-elastica.jpg"
  },
  {
    name: "칼라디움",
    scientificName: "Caladium",
    description: "화려한 색상의 잎이 특징인 관상용 식물로, 실내 장식으로 적합합니다.",
    careInstructions: "간접광에서 키우고 흙이 마르지 않도록 유지하세요. 습도가 높은 환경을 선호합니다.",
    priceRange: "15,000원~40,000원",
    category: "관상용식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "높음",
    imageUrl: "https://example.com/caladium.jpg"
  },
  {
    name: "선인장",
    scientificName: "Cactaceae",
    description: "다양한 종류가 있는 건조 환경 적응형 식물로, 관리가 쉽습니다.",
    careInstructions: "직사광선을 좋아하며 2-3주에 한 번 물을 주세요. 과습에 약합니다.",
    priceRange: "5,000원~20,000원",
    category: "다육식물",
    difficulty: "초보자",
    light: "직사광선",
    waterNeeds: "적음",
    imageUrl: "https://example.com/cactus.jpg"
  },
  {
    name: "크로톤",
    scientificName: "Codiaeum variegatum",
    description: "다양한 색상의 잎이 매력적인 열대 식물로, 실내 장식용으로 인기가 있습니다.",
    careInstructions: "밝은 직사광선을 좋아하며 1-2주에 한 번 물을 주세요. 건조한 환경에 약합니다.",
    priceRange: "15,000원~40,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "밝은 직사광선",
    waterNeeds: "중간",
    imageUrl: "https://example.com/croton.jpg"
  },
  {
    name: "파키라",
    scientificName: "Pachira aquatica",
    description: "금전수로 불리며 행운을 가져다 준다고 믿어지는 인기 있는 실내 식물입니다.",
    careInstructions: "밝은 간접광에서 잘 자라며 흙이 말랐을 때 물을 줍니다. 과습에 약합니다.",
    priceRange: "20,000원~100,000원",
    category: "행운식물",
    difficulty: "초보자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/pachira.jpg"
  },
  {
    name: "디펜바키아",
    scientificName: "Dieffenbachia",
    description: "밝은 얼룩무늬 잎이 특징적인 인기 있는 실내 식물입니다.",
    careInstructions: "간접광에서 잘 자라며 토양이 마르면 물을 주세요. 독성이 있으니 주의하세요.",
    priceRange: "10,000원~30,000원",
    category: "실내식물",
    difficulty: "초보자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/dieffenbachia.jpg"
  },
  {
    name: "스파티필룸",
    scientificName: "Spathiphyllum",
    description: "하얀 꽃이 피는 공기정화 식물로, 평화의 백합이라고도 불립니다.",
    careInstructions: "낮은 조도에서도 잘 자라며 일주일에 한 번 물을 주세요. 물부족 시 잎이 처집니다.",
    priceRange: "10,000원~30,000원",
    category: "공기정화식물",
    difficulty: "초보자",
    light: "낮은 조도~간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/peace-lily.jpg"
  },
  {
    name: "안스리움",
    scientificName: "Anthurium",
    description: "선명한 붉은색 꽃(포엽)이 특징적인 열대 식물로, 관상용으로 인기가 있습니다.",
    careInstructions: "밝은 간접광에서 키우고 토양이 마르면 물을 주세요. 고습도 환경을 선호합니다.",
    priceRange: "15,000원~50,000원",
    category: "꽃식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/anthurium.jpg"
  },
  {
    name: "필로덴드론",
    scientificName: "Philodendron",
    description: "다양한 종류가 있는 인기 있는 실내 식물로, 관리가 쉽고 덩굴성 종류가 많습니다.",
    careInstructions: "간접광에서 잘 자라며 흙이 마르면 물을 주세요. 습도가 높은 환경을 선호합니다.",
    priceRange: "10,000원~50,000원",
    category: "실내식물",
    difficulty: "초보자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/philodendron.jpg"
  },
  {
    name: "크라스톤",
    scientificName: "Calathea",
    description: "아름다운 잎 무늬가 특징인 관상용 실내 식물입니다.",
    careInstructions: "간접광에서 키우고 흙이 마르지 않도록 유지하세요. 습도가 높은 환경을 선호합니다.",
    priceRange: "15,000원~40,000원",
    category: "관상용식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "높음",
    imageUrl: "https://example.com/calathea.jpg"
  },
  {
    name: "쿠페아",
    scientificName: "Cuphea",
    description: "작고 귀여운 꽃이 피는 다년생 식물로, 관상용으로 인기가 있습니다.",
    careInstructions: "햇빛이 잘 드는 곳에서 키우고 토양이 마르면 물을 주세요. 과습에 약합니다.",
    priceRange: "8,000원~20,000원",
    category: "꽃식물",
    difficulty: "중급자",
    light: "직사광선~간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/cuphea.jpg"
  },
  {
    name: "마란타",
    scientificName: "Maranta",
    description: "밤에 잎을 접는 특성이 있어 기도하는 식물이라고도 불립니다.",
    careInstructions: "간접광에서 키우고 흙이 마르지 않도록 유지하세요. 습도가 높은 환경을 선호합니다.",
    priceRange: "12,000원~30,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/maranta.jpg"
  },
  {
    name: "트리색 고무나무",
    scientificName: "Ficus elastica 'Tricolor'",
    description: "잎이 분홍색, 크림색, 녹색의 세 가지 색으로 이루어진 관상용 식물입니다.",
    careInstructions: "밝은 간접광을 좋아하며 물은 흙이 마르면 주세요. 위치 변경에 민감합니다.",
    priceRange: "20,000원~60,000원",
    category: "관상용식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/ficus-tricolor.jpg"
  },
  {
    name: "홍콩야자",
    scientificName: "Rhapis excelsa",
    description: "세련된 잎이 특징적인 관엽식물로, 실내 장식용으로 인기가 있습니다.",
    careInstructions: "간접광에서 잘 자라며 흙이 마르면 물을 주세요. 생장 속도가 느립니다.",
    priceRange: "50,000원~200,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/rhapis.jpg"
  }
];

async function addMorePlants() {
  try {
    // 추가 전 확인
    const beforePlants = await db.select().from(plants);
    console.log(`기존 식물 데이터: ${beforePlants.length}개`);
    
    // 새로운 데이터 추가
    const insertedPlants = await db.insert(plants).values(morePlants).returning();
    console.log(`${insertedPlants.length}개의 식물 데이터를 추가했습니다.`);
    
    // 추가 후 확인
    const afterPlants = await db.select().from(plants);
    console.log(`총 식물 데이터: ${afterPlants.length}개`);
    
  } catch (error) {
    console.error("식물 데이터 추가 중 오류 발생:", error);
  } finally {
    process.exit(0);
  }
}

addMorePlants();