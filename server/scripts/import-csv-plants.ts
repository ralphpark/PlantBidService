import { db } from "../db";
import { plants } from "../../shared/schema";
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

async function importPlantsFromCSV() {
  try {
    const csvPath = './attached_assets/식물데이터 정리 231222.csv';
    console.log(`CSV 파일 경로: ${csvPath}`);
    
    // EUC-KR로 인코딩된 CSV 파일 읽기
    const buffer = fs.readFileSync(csvPath);
    
    // 다양한 인코딩 시도
    const encodings = ['euc-kr', 'cp949', 'utf-8'];
    let decodedContent = '';
    
    // 인코딩 타입 찾기
    for (const encoding of encodings) {
      try {
        decodedContent = iconv.decode(buffer, encoding);
        console.log(`${encoding} 인코딩으로 성공적으로 디코딩했습니다.`);
        break;
      } catch (err) {
        console.log(`${encoding} 인코딩으로 디코딩에 실패했습니다.`);
      }
    }
    
    if (!decodedContent) {
      throw new Error('CSV 파일을 디코딩할 수 없습니다.');
    }
    
    // CSV 파싱
    const results: any[] = [];
    const stream = Readable.from([decodedContent]);
    
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          console.log(`CSV 파일에서 ${results.length}개의 행을 읽었습니다.`);
          resolve();
        })
        .on('error', (err) => {
          console.error('CSV 파싱 오류:', err);
          reject(err);
        });
    });
    
    // 결과 데이터 확인
    if (results.length === 0) {
      console.log('CSV 파일에서 데이터를 찾을 수 없습니다.');
      return;
    }
    
    // 컬럼 이름 확인
    console.log('CSV 파일의 컬럼 이름:', Object.keys(results[0]));
    
    // 데이터 매핑 및 변환
    const plantData = results.map((row: any) => {
      // 컬럼 이름에 따라 매핑 (실제 CSV 파일의 컬럼 이름으로 수정 필요)
      const keys = Object.keys(row);
      
      const nameKey = keys.find(k => k.includes('명') || k.includes('이름') || k === 'Name' || k === 'name') || keys[0];
      const scientificNameKey = keys.find(k => k.includes('학명') || k === 'Scientific Name' || k === 'scientific_name') || '';
      const descriptionKey = keys.find(k => k.includes('설명') || k === 'Description' || k === 'description') || '';
      const lightKey = keys.find(k => k.includes('빛') || k.includes('광') || k === 'Light' || k === 'light') || '';
      const waterKey = keys.find(k => k.includes('물') || k.includes('습도') || k === 'Water' || k === 'water') || '';
      const categoryKey = keys.find(k => k.includes('용도') || k.includes('분류') || k === 'Category' || k === 'category') || '';
      const difficultyKey = keys.find(k => k.includes('관리') || k.includes('난이도') || k === 'Difficulty' || k === 'difficulty') || '';
      
      return {
        name: row[nameKey] || '',
        scientificName: row[scientificNameKey] || '',
        description: row[descriptionKey] || '특별한 설명이 없는 식물입니다.',
        careInstructions: `${row[lightKey] || '적당한 빛'} 환경에서 키우세요. ${row[waterKey] || '적당히'} 물을 주는 것이 좋습니다.`,
        priceRange: `${Math.floor(Math.random() * 10 + 5) * 1000}원~${Math.floor(Math.random() * 20 + 15) * 1000}원`,
        category: row[categoryKey] || '실내식물',
        difficulty: row[difficultyKey] || '초보자',
        light: row[lightKey] || '간접광',
        waterNeeds: row[waterKey] || '중간',
        imageUrl: `https://example.com/plants/${encodeURIComponent(row[nameKey] || 'plant')}.jpg`
      };
    });
    
    // 유효한 데이터만 필터링 (이름이 있는 경우만)
    const validPlantData = plantData.filter(plant => plant.name && plant.name.trim() !== '');
    console.log(`유효한 식물 데이터 수: ${validPlantData.length}개`);
    
    // 기존 데이터 확인
    const existingPlants = await db.select().from(plants);
    const existingNames = new Set(existingPlants.map(p => p.name));
    console.log(`기존 식물 데이터: ${existingPlants.length}개`);
    
    // 새로운 데이터만 필터링 (중복 이름 제외)
    const newPlantData = validPlantData.filter(plant => !existingNames.has(plant.name));
    console.log(`새로 추가할 식물 데이터: ${newPlantData.length}개`);
    
    // 새 데이터가 없으면 종료
    if (newPlantData.length === 0) {
      console.log('새로 추가할 식물 데이터가 없습니다.');
      return;
    }
    
    // 분할하여 데이터 삽입 (한 번에 너무 많은 데이터를 삽입하면 오류 발생 가능)
    const chunkSize = 50;
    for (let i = 0; i < newPlantData.length; i += chunkSize) {
      const chunk = newPlantData.slice(i, i + chunkSize);
      await db.insert(plants).values(chunk);
      console.log(`${i + 1}~${Math.min(i + chunkSize, newPlantData.length)}개 데이터 삽입 완료`);
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