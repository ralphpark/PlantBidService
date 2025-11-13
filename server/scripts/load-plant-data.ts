import { db } from "../db";
import { plants } from "../../shared/schema";
import * as fs from 'fs';
import * as iconv from 'iconv-lite';
import * as path from 'path';
import * as xlsx from 'xlsx';

async function importPlantsFromXLSX() {
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
    
    // Excel 파일 경로 - 절대 경로 사용
    const xlsxPath = '/home/runner/workspace/attached_assets/식물데이터 정리 231222.xlsx';
    console.log(`XLSX 파일 경로: ${xlsxPath}`);
    console.log(`파일 존재 여부: ${fs.existsSync(xlsxPath)}`);
    
    if (!fs.existsSync(xlsxPath)) {
      throw new Error('XLSX 파일을 찾을 수 없습니다.');
    }
    
    // 엑셀 파일 읽기
    const workbook = xlsx.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log(`Excel 파일에서 ${data.length}개의 행을 읽었습니다.`);
    
    if (data.length === 0) {
      console.log('Excel 파일에서 데이터를 찾을 수 없습니다.');
      return;
    }
    
    // 컬럼 이름 확인
    console.log('엑셀 파일의 첫번째 행:', data[0]);
    
    // 데이터 매핑 및 변환
    const plantData = data.map((row: any) => {
      // 사용 가능한 키 목록 확인
      const keys = Object.keys(row);
      
      // 가능한 키 찾기
      const nameKey = keys.find(k => 
        k.includes('이름') || 
        k.includes('식물명') || 
        k.includes('명칭') || 
        k === '식물' || 
        k === '식물이름') || keys[0];
        
      const scientificNameKey = keys.find(k => 
        k.includes('학명') || 
        k.includes('영명') || 
        k.includes('Scientific')) || '';
        
      const lightKey = keys.find(k => 
        k.includes('광도') || 
        k.includes('빛') || 
        k.includes('채광') || 
        k.includes('햇빛')) || '';
        
      const waterKey = keys.find(k => 
        k.includes('물주기') || 
        k.includes('급수') || 
        k.includes('수분') || 
        k.includes('관수')) || '';
        
      const humidityKey = keys.find(k => 
        k.includes('습도') || 
        k.includes('분무')) || '';
        
      const tempKey = keys.find(k => 
        k.includes('온도') || 
        k.includes('기온')) || '';
        
      const descriptionKey = keys.find(k => 
        k.includes('특징') || 
        k.includes('설명') || 
        k.includes('비고')) || '';
        
      const categoryKey = keys.find(k => 
        k.includes('분류') || 
        k.includes('종류') || 
        k.includes('용도')) || '';
        
      const difficultyKey = keys.find(k => 
        k.includes('난이도') || 
        k.includes('관리') || 
        k.includes('어려움')) || '';
      
      // 값 추출
      const name = row[nameKey] ? String(row[nameKey]).trim() : '';
      const scientificName = scientificNameKey && row[scientificNameKey] ? String(row[scientificNameKey]).trim() : '';
      const light = lightKey && row[lightKey] ? String(row[lightKey]).trim() : '보통 광도';
      const water = waterKey && row[waterKey] ? String(row[waterKey]).trim() : '일주일에 한번';
      const humidity = humidityKey && row[humidityKey] ? String(row[humidityKey]).trim() : '보통';
      const temp = tempKey && row[tempKey] ? String(row[tempKey]).trim() : '18-24°C';
      const description = descriptionKey && row[descriptionKey] ? String(row[descriptionKey]).trim() : '';
      const category = categoryKey && row[categoryKey] ? String(row[categoryKey]).trim() : '실내식물';
      const difficulty = difficultyKey && row[difficultyKey] ? String(row[difficultyKey]).trim() : '초보자';
      
      // 관리 지침 생성
      const careInstructions = `
        빛: ${light}
        물주기: ${water}
        습도: ${humidity}
        온도: ${temp}
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
    
    // 분할하여 데이터 삽입 (한 번에 너무 많은 데이터를 삽입하면 오류 발생 가능)
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

importPlantsFromXLSX();