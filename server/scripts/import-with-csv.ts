import { db } from "../db";
import { plants } from "../../shared/schema";
import * as fs from 'fs';
import * as path from 'path';

// 간단한 CSV 파서
function parseCSV(content: string): any[] {
  const lines = content.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const obj: any = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] ? values[index].trim() : '';
    });
    
    results.push(obj);
  }
  
  return results;
}

async function importPlantsFromCSV() {
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
    
    // CSV 파일 경로
    const csvPath = '/home/runner/workspace/attached_assets/식물데이터 정리 231222.csv';
    console.log(`CSV 파일 경로: ${csvPath}`);
    console.log(`파일 존재 여부: ${fs.existsSync(csvPath)}`);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV 파일을 찾을 수 없습니다.');
    }
    
    // CSV 파일 읽기
    const content = fs.readFileSync(csvPath, 'utf-8');
    console.log(`CSV 파일 크기: ${content.length} 바이트`);
    
    // CSV 파싱
    const data = parseCSV(content);
    console.log(`CSV 파일에서 ${data.length}개의 행을 읽었습니다.`);
    
    if (data.length === 0) {
      console.log('CSV 파일에서 데이터를 찾을 수 없습니다.');
      return;
    }
    
    // 데이터 프리뷰
    console.log('CSV 데이터 첫 번째 행:', data[0]);
    console.log('CSV 데이터 열:', Object.keys(data[0]));
    
    // 데이터 매핑 및 변환
    const plantData = data.map((row: any) => {
      // 모든 키 가져오기
      const keys = Object.keys(row);
      
      // 매핑할 키 찾기 (직접 컬럼명 확인 후 수정)
      const name = row['식물이름'] || row['이름'] || row[keys[0]] || '';
      const scientificName = row['학명'] || row['영문명'] || '';
      const description = row['특징'] || row['설명'] || '';
      const light = row['광도'] || row['빛'] || row['햇빛'] || '적정 광도';
      const water = row['물주기'] || row['급수'] || '일주일에 한번';
      const humidity = row['습도'] || '보통';
      const temperature = row['온도'] || '18-24°C';
      const difficulty = row['난이도'] || row['관리'] || '초보자';
      const category = row['분류'] || row['용도'] || '실내식물';
      
      // 관리 지침 생성
      const careInstructions = `
        빛: ${light}
        물주기: ${water}
        습도: ${humidity}
        온도: ${temperature}
      `.trim();
      
      // 가격대 생성
      const minPrice = Math.floor(Math.random() * 10 + 5) * 1000;
      const maxPrice = Math.floor(Math.random() * 20 + 15) * 1000;
      const priceRange = `${minPrice}원~${maxPrice}원`;
      
      return {
        name,
        scientificName,
        description: description || `${name}은(는) 실내에서 키우기 좋은 식물입니다.`,
        careInstructions,
        priceRange,
        category,
        difficulty,
        light,
        waterNeeds: water,
        imageUrl: `https://example.com/plants/${encodeURIComponent(name || 'plant')}.jpg`
      };
    });
    
    // 유효한 데이터만 필터링 (이름이 있는 경우만)
    const validPlantData = plantData.filter(plant => plant.name && plant.name.trim() !== '');
    console.log(`유효한 식물 데이터 수: ${validPlantData.length}개`);
    
    if (validPlantData.length === 0) {
      console.log('유효한 식물 데이터가 없습니다.');
      return;
    }
    
    // 분할하여 데이터 삽입
    const chunkSize = 50;
    for (let i = 0; i < validPlantData.length; i += chunkSize) {
      const chunk = validPlantData.slice(i, i + chunkSize);
      await db.insert(plants).values(chunk);
      console.log(`${i + 1}~${Math.min(i + chunkSize, validPlantData.length)}개 데이터 삽입 완료`);
    }
    
    // 결과 확인
    const insertedPlants = await db.select().from(plants);
    console.log(`총 ${insertedPlants.length}개의 식물 데이터가 데이터베이스에 저장되었습니다.`);
    
  } catch (error) {
    console.error('식물 데이터 가져오기 오류:', error);
  } finally {
    process.exit(0);
  }
}

importPlantsFromCSV();