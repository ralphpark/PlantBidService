import { db } from "../db";
import { plants } from "../../shared/schema";

// 실제 데이터를 기반으로 한 플랜트 데이터 샘플
const plantData = [
  {
    name: "몬스테라",
    scientificName: "Monstera deliciosa",
    description: "구멍이 뚫린 특이한 잎 모양으로 인기 있는 관엽식물입니다. 열대 우림 지역이 원산지로, 공기 정화 능력이 뛰어나며 실내 장식으로 인기가 많습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙이 말랐을 때 충분히 물을 주세요.\n습도: 보통 이상의 습도를 유지해 주세요.\n온도: 18-30°C 사이가 적합합니다.",
    priceRange: "15000원~30000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/monstera.jpg"
  },
  {
    name: "산세베리아",
    scientificName: "Sansevieria trifasciata",
    description: "공기 정화 능력이 뛰어나고 관리가 쉬운 다육식물입니다. 밤에도 산소를 배출하여 침실에 두기 좋습니다.",
    careInstructions: "빛: 다양한 빛 조건에 적응합니다.\n물주기: 흙이 완전히 마르면 물을 주세요.\n습도: 건조한 환경에 강합니다.\n온도: 15-27°C가 적합합니다.",
    priceRange: "10000원~20000원",
    category: "다육식물",
    difficulty: "초보자",
    light: "낮은 광도~밝은 간접광",
    waterNeeds: "낮음",
    imageUrl: "https://example.com/plants/sansevieria.jpg"
  },
  {
    name: "피커스 벤자민",
    scientificName: "Ficus benjamina",
    description: "우아한 모습의 고전적인 실내식물로, 공기 정화 능력이 뛰어나며 빠르게 성장합니다.",
    careInstructions: "빛: 밝은 간접광을 좋아합니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 보통 이상의 습도가 좋습니다.\n온도: 18-24°C가 적합합니다.",
    priceRange: "15000원~35000원",
    category: "관엽식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/ficus_benjamina.jpg"
  },
  {
    name: "아레카 야자",
    scientificName: "Dypsis lutescens",
    description: "열대 분위기를 연출하는 우아한 야자수로, 공기 정화 능력이 뛰어나고 시원한 느낌을 줍니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 높은 습도를 좋아합니다.\n온도: 18-24°C가 적합합니다.",
    priceRange: "20000원~40000원",
    category: "야자류",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간-높음",
    imageUrl: "https://example.com/plants/areca_palm.jpg"
  },
  {
    name: "스파티필룸",
    scientificName: "Spathiphyllum wallisii",
    description: "공기 정화 능력이 뛰어나고 우아한 흰색 꽃을 피우는 인기 있는 실내식물입니다.",
    careInstructions: "빛: 간접광에서 잘 자랍니다.\n물주기: 흙이 약간 마르면 물을 주세요.\n습도: 높은 습도를 좋아합니다.\n온도: 18-30°C가 적합합니다.",
    priceRange: "12000원~25000원",
    category: "꽃이 피는 식물",
    difficulty: "초보자",
    light: "낮은 광도~중간 광도",
    waterNeeds: "중간-높음",
    imageUrl: "https://example.com/plants/peace_lily.jpg"
  },
  {
    name: "필로덴드론",
    scientificName: "Philodendron hederaceum",
    description: "다양한 종류가 있는 열대 식물로, 관리가 쉽고 다양한 환경에 적응하기 좋습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 보통 이상의 습도를 좋아합니다.\n온도: 18-27°C가 적합합니다.",
    priceRange: "12000원~28000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "낮은 광도~밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/philodendron.jpg"
  },
  {
    name: "파키라",
    scientificName: "Pachira aquatica",
    description: "금전수라고도 불리며 다양한 크기로 키울 수 있는 행운을 상징하는 식물입니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙이 약간 마르면 물을 주세요.\n습도: 보통의 습도를 좋아합니다.\n온도: 15-26°C가 적합합니다.",
    priceRange: "15000원~35000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "중간 광도~밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/money_tree.jpg"
  },
  {
    name: "드라세나 마지나타",
    scientificName: "Dracaena marginata",
    description: "세련된 모습의 관엽식물로 공기 정화 능력이 뛰어나며 키우기 쉽습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 다양한 습도에 적응합니다.\n온도: 18-27°C가 적합합니다.",
    priceRange: "15000원~30000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "중간 광도~밝은 간접광",
    waterNeeds: "낮음-중간",
    imageUrl: "https://example.com/plants/dragon_tree.jpg"
  },
  {
    name: "알로카시아",
    scientificName: "Alocasia macrorrhiza",
    description: "큰 잎이 특징적인 열대 식물로 독특한 잎 모양이 실내 장식에 좋습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙이 약간 마르면 물을 주세요.\n습도: 높은 습도를 좋아합니다.\n온도: 18-27°C가 적합합니다.",
    priceRange: "18000원~40000원",
    category: "관엽식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간-높음",
    imageUrl: "https://example.com/plants/alocasia.jpg"
  },
  {
    name: "캘러디움",
    scientificName: "Caladium bicolor",
    description: "화려한 색상의 잎이 특징적인 관상용 식물로, 실내 장식에 인기가 많습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙을 촉촉하게 유지하세요.\n습도: 높은 습도를 좋아합니다.\n온도: 18-30°C가 적합합니다.",
    priceRange: "15000원~30000원",
    category: "관엽식물",
    difficulty: "중급자",
    light: "간접광",
    waterNeeds: "높음",
    imageUrl: "https://example.com/plants/caladium.jpg"
  },
  {
    name: "벵갈고무나무",
    scientificName: "Ficus elastica",
    description: "광택 있는 큰 잎이 특징적인 관엽식물로, 공기 정화 능력이 뛰어나고 키우기 쉽습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 다양한 습도에 적응합니다.\n온도: 18-27°C가 적합합니다.",
    priceRange: "15000원~35000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "중간 광도~밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/rubber_plant.jpg"
  },
  {
    name: "행운목",
    scientificName: "Dracaena fragrans",
    description: "관리가 쉽고 오래 키울 수 있어 인기 있는 관엽식물입니다. 공기 정화 능력이 뛰어납니다.",
    careInstructions: "빛: 간접광에서 잘 자랍니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 다양한 습도에 적응합니다.\n온도: 15-24°C가 적합합니다.",
    priceRange: "15000원~35000원",
    category: "관엽식물",
    difficulty: "초보자",
    light: "낮은 광도~중간 광도",
    waterNeeds: "낮음-중간",
    imageUrl: "https://example.com/plants/corn_plant.jpg"
  },
  {
    name: "스킨답서스",
    scientificName: "Epipremnum aureum",
    description: "덩굴성 식물로 공기 정화 능력이 뛰어나고 관리가 쉬워 초보자에게 적합합니다.",
    careInstructions: "빛: 다양한 빛 조건에 적응합니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 다양한 습도에 적응합니다.\n온도: 18-24°C가 적합합니다.",
    priceRange: "10000원~20000원",
    category: "덩굴식물",
    difficulty: "초보자",
    light: "낮은 광도~밝은 간접광",
    waterNeeds: "낮음-중간",
    imageUrl: "https://example.com/plants/pothos.jpg"
  },
  {
    name: "호야",
    scientificName: "Hoya carnosa",
    description: "밀랍같은 꽃이 피는 덩굴성 식물로, 공기 정화 능력이 있고 키우기 쉬운 다육식물입니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙이 완전히 마르면 물을 주세요.\n습도: 보통의 습도를 좋아합니다.\n온도: 15-27°C가 적합합니다.",
    priceRange: "12000원~25000원",
    category: "덩굴식물",
    difficulty: "초보자",
    light: "밝은 간접광",
    waterNeeds: "낮음",
    imageUrl: "https://example.com/plants/wax_plant.jpg"
  },
  {
    name: "핑크프린세스",
    scientificName: "Philodendron erubescens 'Pink Princess'",
    description: "핑크색 무늬가 있는 잎이 특징적인 고급 관엽식물로, 희소성이 높아 인기가 많습니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙 표면이 마르면 물을 주세요.\n습도: 높은 습도를 좋아합니다.\n온도: 18-27°C가 적합합니다.",
    priceRange: "50000원~150000원",
    category: "관엽식물",
    difficulty: "중급자",
    light: "밝은 간접광",
    waterNeeds: "중간",
    imageUrl: "https://example.com/plants/pink_princess.jpg"
  },
  {
    name: "아디안텀 (메이든헤어 고사리)",
    scientificName: "Adiantum raddianum",
    description: "부드러운 잎이 특징적인 우아한 고사리로, 높은 습도를 좋아하는 식물입니다.",
    careInstructions: "빛: 밝은 간접광이 좋습니다.\n물주기: 흙을 촉촉하게 유지하세요.\n습도: 높은 습도를 필요로 합니다.\n온도: 18-24°C가 적합합니다.",
    priceRange: "12000원~25000원",
    category: "고사리류",
    difficulty: "중급자",
    light: "중간 광도",
    waterNeeds: "높음",
    imageUrl: "https://example.com/plants/maidenhair_fern.jpg"
  }
];

async function seedPlantData() {
  try {
    // 기존 데이터 확인
    const existingPlants = await db.select().from(plants);
    console.log(`기존 식물 데이터: ${existingPlants.length}개`);
    
    // 기존 데이터 삭제
    if (existingPlants.length > 0) {
      console.log('기존 식물 데이터를 삭제합니다...');
      await db.delete(plants);
      console.log('기존 식물 데이터가 삭제되었습니다.');
    }
    
    // 샘플 데이터 삽입
    console.log(`${plantData.length}개의 식물 데이터를 추가합니다...`);
    await db.insert(plants).values(plantData);
    
    // 결과 확인
    const insertedPlants = await db.select().from(plants);
    console.log(`총 ${insertedPlants.length}개의 식물 데이터가 데이터베이스에 저장되었습니다.`);
    
  } catch (error) {
    console.error('식물 데이터 seed 오류:', error);
  } finally {
    process.exit(0);
  }
}

seedPlantData();