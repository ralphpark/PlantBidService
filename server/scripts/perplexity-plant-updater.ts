import { db } from '../db/index.js';
import { plants } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Perplexity API를 사용해 식물 정보를 자동으로 업데이트하는 스크립트
 */

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface PlantUpdateInfo {
  scientific_name?: string;
  care_instructions?: string;
  light?: string;
  water_needs?: string;
  humidity?: string;
  temperature?: string;
  difficulty?: string;
  pet_safety?: string;
  description?: string;
}

class PlantUpdater {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY 환경변수가 설정되지 않았습니다.');
    }
  }

  async callPerplexityAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a plant expert. Provide accurate and detailed information about plants in Korean. Return information in JSON format only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.2,
          top_p: 0.9,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API 오류: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Perplexity API 호출 실패:', error);
      throw error;
    }
  }

  async getPlantInfo(plantName: string, scientificName?: string): Promise<PlantUpdateInfo | null> {
    try {
      const searchTerm = scientificName || plantName;
      const prompt = `
        "${searchTerm}" 식물에 대한 정보를 다음 JSON 형식으로 정확히 제공해주세요:
        
        {
          "scientific_name": "학명",
          "care_instructions": "상세한 관리 방법",
          "light": "광조건 (예: 밝은 간접광)",
          "water_needs": "물주기 (예: 주 1-2회)",
          "humidity": "습도 (예: 40-60%)",
          "temperature": "온도 (예: 18-25°C)",
          "difficulty": "키우기 난이도 (쉬움/보통/어려움)",
          "pet_safety": "반려동물 안전성 (안전함/독성 있음/주의 필요)",
          "description": "식물 설명"
        }
        
        정확한 정보만 제공하고, 확실하지 않은 정보는 null로 표시해주세요.
      `;

      const response = await this.callPerplexityAPI(prompt);
      
      // JSON 파싱 시도
      try {
        const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
        const plantInfo = JSON.parse(cleanedResponse);
        return plantInfo;
      } catch (parseError) {
        console.error('JSON 파싱 실패:', response);
        return null;
      }
    } catch (error) {
      console.error(`식물 정보 조회 실패 (${plantName}):`, error);
      return null;
    }
  }

  async updatePlantInfo(plantId: number, updates: PlantUpdateInfo): Promise<boolean> {
    try {
      // null이 아닌 값들만 필터링
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      );

      if (Object.keys(filteredUpdates).length === 0) {
        console.log(`업데이트할 정보가 없습니다 (ID: ${plantId})`);
        return false;
      }

      await db.update(plants)
        .set(filteredUpdates)
        .where(eq(plants.id, plantId));

      console.log(`✅ 식물 정보 업데이트 완료 (ID: ${plantId}):`, Object.keys(filteredUpdates));
      return true;
    } catch (error) {
      console.error(`식물 정보 업데이트 실패 (ID: ${plantId}):`, error);
      return false;
    }
  }

  async updateAllPlants(): Promise<void> {
    try {
      console.log('=== 식물 정보 자동 업데이트 시작 ===');
      
      // 데이터베이스에서 모든 식물 조회
      const allPlants = await db.select().from(plants);
      console.log(`총 ${allPlants.length}개의 식물을 찾았습니다.`);

      let updateCount = 0;
      let errorCount = 0;

      for (const plant of allPlants) {
        console.log(`\n처리 중: ${plant.name} (ID: ${plant.id})`);
        
        try {
          // API 호출 제한을 위한 지연
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const newInfo = await this.getPlantInfo(plant.name, plant.scientific_name || undefined);
          
          if (newInfo) {
            const success = await this.updatePlantInfo(plant.id, newInfo);
            if (success) {
              updateCount++;
            }
          } else {
            console.log(`❌ 정보를 가져올 수 없습니다: ${plant.name}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ 처리 실패: ${plant.name}`, error);
          errorCount++;
        }
      }

      console.log(`\n=== 업데이트 완료 ===`);
      console.log(`성공: ${updateCount}개`);
      console.log(`실패: ${errorCount}개`);
      console.log(`전체: ${allPlants.length}개`);
      
    } catch (error) {
      console.error('식물 정보 업데이트 중 오류:', error);
      throw error;
    }
  }

  async updateSpecificPlant(plantId: number): Promise<void> {
    try {
      const plant = await db.select().from(plants).where(eq(plants.id, plantId));
      
      if (plant.length === 0) {
        throw new Error(`식물을 찾을 수 없습니다 (ID: ${plantId})`);
      }

      const plantData = plant[0];
      console.log(`식물 정보 업데이트: ${plantData.name}`);

      const newInfo = await this.getPlantInfo(plantData.name, plantData.scientific_name || undefined);
      
      if (newInfo) {
        const success = await this.updatePlantInfo(plantId, newInfo);
        if (success) {
          console.log('✅ 업데이트 완료');
        } else {
          console.log('❌ 업데이트 실패');
        }
      } else {
        console.log('❌ 새로운 정보를 가져올 수 없습니다');
      }
    } catch (error) {
      console.error('식물 정보 업데이트 실패:', error);
      throw error;
    }
  }
}

// 직접 실행 시
if (require.main === module) {
  const updater = new PlantUpdater();
  const action = process.argv[2];
  
  if (action === 'all') {
    updater.updateAllPlants()
      .then(() => {
        console.log('모든 식물 정보 업데이트 완료');
        process.exit(0);
      })
      .catch(error => {
        console.error('업데이트 실패:', error);
        process.exit(1);
      });
  } else if (action === 'single') {
    const plantId = parseInt(process.argv[3]);
    if (!plantId || isNaN(plantId)) {
      console.error('사용법: npm run update-plants single <식물ID>');
      process.exit(1);
    }
    
    updater.updateSpecificPlant(plantId)
      .then(() => {
        console.log('식물 정보 업데이트 완료');
        process.exit(0);
      })
      .catch(error => {
        console.error('업데이트 실패:', error);
        process.exit(1);
      });
  } else {
    console.log('사용법:');
    console.log('모든 식물 업데이트: npm run update-plants all');
    console.log('특정 식물 업데이트: npm run update-plants single <식물ID>');
  }
}

export { PlantUpdater };