import { db } from "../db";
import { plants } from "../../shared/schema";

// 샘플 식물 데이터
const samplePlants = [
  {
    name: "몬스테라",
    description: "큰 잎이 특징적인 인기 있는 실내 식물로, 열대 분위기를 연출합니다.",
    careInstructions: "간접광을 좋아하며 1-2주에 한 번 물을 주세요. 건조해지면 물을 주는 것이 좋습니다.",
    priceRange: "15,000원~50,000원",
    category: "실내식물",
    difficulty: "초보자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/monstera.jpg"
  },
  {
    name: "산세베리아",
    description: "생명력이 강하고 공기정화 능력이 뛰어난 다육식물입니다.",
    careInstructions: "직사광선을 피하고 2-3주에 한 번 물을 주세요. 과습에 약합니다.",
    priceRange: "10,000원~30,000원",
    category: "공기정화식물",
    difficulty: "초보자",
    light: "낮은 조도",
    waterNeeds: "적음",
    imageUrl: "https://example.com/sansevieria.jpg"
  },
  {
    name: "아레카 야자",
    description: "열대 분위기를 연출하는 대형 실내 식물로, 공기 정화 효과가 있습니다.",
    careInstructions: "밝은 간접광에서 잘 자라며 토양이 마르면 물을 주세요. 습도가 높은 환경을 선호합니다.",
    priceRange: "30,000원~100,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/areca.jpg"
  },
  {
    name: "스투키",
    description: "기둥 형태로 자라는 생명력이 강한 다육식물입니다.",
    careInstructions: "2-3주에 한 번 물을 주고 햇빛이 잘 드는 곳에 두세요. 과습에 매우 약합니다.",
    priceRange: "8,000원~25,000원",
    category: "다육식물",
    difficulty: "초보자",
    light: "직사광선~간접광",
    waterNeeds: "적음",
    imageUrl: "https://example.com/stucky.jpg"
  },
  {
    name: "피어스",
    description: "아름다운 잎이 인상적인 중대형 관엽식물입니다.",
    careInstructions: "밝은 간접광을 좋아하며 물은 흙이 마르면 주세요. 과습에 약합니다.",
    priceRange: "25,000원~80,000원",
    category: "실내식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/ficus.jpg"
  },
  {
    name: "행운목",
    description: "긴 수명과 행운을 상징하는 선물용으로 인기 있는 식물입니다.",
    careInstructions: "간접광에서 잘 자라며 1-2주에 한 번 물을 주세요. 건조해지면 잎 끝이 갈변됩니다.",
    priceRange: "15,000원~40,000원",
    category: "선물용",
    difficulty: "초보자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/dracaena.jpg"
  },
  {
    name: "호접란",
    description: "아름다운 꽃이 피는 실내 관상용 난초로, 고급스러운 분위기를 연출합니다.",
    careInstructions: "직사광선을 피하고 1주일에 한 번 물을 주세요. 습도 유지가 중요합니다.",
    priceRange: "30,000원~100,000원",
    category: "꽃식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/phalaenopsis.jpg"
  },
  {
    name: "율마",
    description: "풍수에서 재물운을 가져온다고 알려진 나무형 식물입니다.",
    careInstructions: "밝은 곳에서 잘 자라며 1-2주에 한 번 물을 주세요. 겨울에는 물 주기를 줄이세요.",
    priceRange: "50,000원~200,000원",
    category: "선물용",
    difficulty: "중급자",
    light: "직사광선~간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/yulma.jpg"
  },
  {
    name: "스킨답서스",
    description: "길게 늘어지는 덩굴식물로, 선반이나 행잉 플랜트로 적합합니다.",
    careInstructions: "낮은 조도에서도 잘 자라며 흙이 마르면 물을 주세요. 번식력이 강합니다.",
    priceRange: "8,000원~20,000원",
    category: "실내식물",
    difficulty: "초보자",
    light: "낮은 조도~간접광",
    waterNeeds: "적음",
    imageUrl: "https://example.com/pothos.jpg"
  },
  {
    name: "뱅갈고무나무",
    description: "광택 있는 잎이 특징적인 중대형 관엽식물입니다.",
    careInstructions: "밝은 간접광을 좋아하며 흙이 마르면 물을 주세요. 과습에 약합니다.",
    priceRange: "20,000원~60,000원",
    category: "실내식물",
    difficulty: "초보자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/ficus-benghalensis.jpg"
  }
];

async function seedPlants() {
  try {
    // 기존 데이터 확인
    const existingPlants = await db.select().from(plants);
    console.log(`기존 식물 데이터: ${existingPlants.length}개`);
    
    if (existingPlants.length === 0) {
      // 데이터 삽입
      const insertedPlants = await db.insert(plants).values(samplePlants).returning();
      console.log(`${insertedPlants.length}개의 식물 데이터를 추가했습니다.`);
    } else {
      console.log("이미 식물 데이터가 있어 추가하지 않았습니다.");
    }
    
    // 데이터 확인
    const allPlants = await db.select().from(plants);
    console.log(`총 식물 데이터: ${allPlants.length}개`);
    
  } catch (error) {
    console.error("식물 데이터 추가 중 오류 발생:", error);
  } finally {
    process.exit(0);
  }
}

seedPlants();