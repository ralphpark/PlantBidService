import { db } from "../db";
import { plants } from "../../shared/schema";
import { readFile, utils } from 'xlsx';
import * as path from 'path';

async function importPlantsFromExcel() {
  try {
    // 엑셀 파일 경로
    const excelPath = './attached_assets/식물데이터 정리 231222.xlsx';
    console.log(`엑셀 파일 경로: ${excelPath}`);
    
    // 엑셀 파일 읽기
    const workbook = readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 데이터 변환
    const rawData = utils.sheet_to_json(worksheet);
    console.log(`엑셀에서 읽은 데이터 수: ${rawData.length}개`);
    
    // 데이터 매핑 및 변환
    const plantData = rawData.map((row: any) => ({
      name: row['식물명'] || '',
      scientificName: row['학명'] || '',
      description: row['설명'] || '특별한 설명이 없는 식물입니다.',
      careInstructions: `${row['빛'] || '적당한 빛'} 환경에서 키우세요. ${row['물주기'] || '적당히'} 물을 주는 것이 좋습니다.`,
      priceRange: `${Math.floor(Math.random() * 10 + 5) * 1000}원~${Math.floor(Math.random() * 20 + 15) * 1000}원`,
      category: row['용도'] || '실내식물',
      difficulty: row['관리수준'] || '초보자',
      light: row['빛'] || '간접광',
      waterNeeds: row['물주기'] || '중간',
      imageUrl: `https://example.com/plants/${encodeURIComponent(row['식물명'] || 'plant')}.jpg`
    }));
    
    // 유효한 데이터만 필터링 (이름이 있는 경우만)
    const validPlantData = plantData.filter(plant => plant.name && plant.name.trim() !== '');
    console.log(`유효한 식물 데이터 수: ${validPlantData.length}개`);
    
    // 기존 데이터 삭제 (선택적)
    await db.delete(plants);
    console.log('기존 식물 데이터를 삭제했습니다.');
    
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

importPlantsFromExcel();