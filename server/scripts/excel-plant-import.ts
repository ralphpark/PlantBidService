import * as XLSX from 'xlsx';
import { db } from '../db/index.js';
import { plants } from '../../shared/schema.js';

/**
 * 엑셀 파일에서 식물 데이터를 가져와 데이터베이스에 저장하는 스크립트
 */

interface PlantExcelRow {
  '식물명': string;
  '학명'?: string;
  '설명': string;
  '관리방법'?: string;
  '광조건'?: string;
  '물요구량'?: string;
  '습도'?: string;
  '온도'?: string;
  '겨울온도'?: string;
  '색상특징'?: string;
  '식물타입'?: string;
  '가시유무'?: string;
  '잎모양1'?: string;
  '잎모양2'?: string;
  '잎모양3'?: string;
  '잎모양4'?: string;
  '난이도'?: string;
  '경험수준'?: string;
  '반려동물안전성'?: string;
  '크기'?: string;
  '카테고리'?: string;
  '가격대'?: string;
  '이미지URL'?: string;
}

export async function importPlantsFromExcel(filePath: string) {
  try {
    console.log(`엑셀 파일 읽기 시작: ${filePath}`);
    
    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환
    const jsonData: PlantExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`${jsonData.length}개의 식물 데이터를 찾았습니다.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of jsonData) {
      try {
        // 필수 필드 검증
        if (!row['식물명'] || !row['설명']) {
          console.log(`건너뛰기: 필수 필드 누락 - ${row['식물명'] || '이름 없음'}`);
          errorCount++;
          continue;
        }
        
        // 데이터베이스 삽입
        await db.insert(plants).values({
          name: row['식물명'],
          scientific_name: row['학명'] || null,
          description: row['설명'],
          care_instructions: row['관리방법'] || null,
          light: row['광조건'] || null,
          water_needs: row['물요구량'] || null,
          humidity: row['습도'] || null,
          temperature: row['온도'] || null,
          winter_temperature: row['겨울온도'] || null,
          color_feature: row['색상특징'] || null,
          plant_type: row['식물타입'] || null,
          has_thorns: row['가시유무'] === '있음' || row['가시유무'] === 'true',
          leaf_shape1: row['잎모양1'] || null,
          leaf_shape2: row['잎모양2'] || null,
          leaf_shape3: row['잎모양3'] || null,
          leaf_shape4: row['잎모양4'] || null,
          difficulty: row['난이도'] || null,
          experience_level: row['경험수준'] || null,
          pet_safety: row['반려동물안전성'] || null,
          size: row['크기'] || null,
          category: row['카테고리'] || null,
          price_range: row['가격대'] || null,
          image_url: row['이미지URL'] || null
        });
        
        successCount++;
        console.log(`✅ 추가 완료: ${row['식물명']}`);
        
      } catch (error) {
        console.error(`❌ 오류 발생 (${row['식물명']}):`, error);
        errorCount++;
      }
    }
    
    console.log(`\n=== 가져오기 완료 ===`);
    console.log(`성공: ${successCount}개`);
    console.log(`실패: ${errorCount}개`);
    console.log(`전체: ${jsonData.length}개`);
    
    return {
      success: successCount,
      error: errorCount,
      total: jsonData.length
    };
    
  } catch (error) {
    console.error('엑셀 파일 처리 중 오류:', error);
    throw error;
  }
}

export function createExcelTemplate() {
  const templateData = [
    {
      '식물명': '예시 식물',
      '학명': 'Plantus exemplaris',
      '설명': '이것은 예시 식물입니다. 설명은 10자 이상 입력해주세요.',
      '관리방법': '물을 주 1-2회 주고, 밝은 곳에 두세요.',
      '광조건': '밝은 간접광',
      '물요구량': '주 1-2회',
      '습도': '40-60%',
      '온도': '18-25°C',
      '겨울온도': '15-20°C',
      '색상특징': '진한 녹색',
      '식물타입': '관엽식물',
      '가시유무': '없음',
      '잎모양1': '타원형',
      '잎모양2': '',
      '잎모양3': '',
      '잎모양4': '',
      '난이도': '쉬움',
      '경험수준': '초보자',
      '반려동물안전성': '안전함',
      '크기': '중형',
      '카테고리': '관엽식물',
      '가격대': '10,000-30,000원',
      '이미지URL': 'https://example.com/image.jpg'
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '식물 데이터');
  
  const filePath = './plant-template.xlsx';
  XLSX.writeFile(workbook, filePath);
  
  console.log(`엑셀 템플릿이 생성되었습니다: ${filePath}`);
  return filePath;
}

// 직접 실행 시
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'template') {
    createExcelTemplate();
  } else if (action === 'import') {
    const filePath = process.argv[3];
    if (!filePath) {
      console.error('사용법: npm run excel-import import <파일경로>');
      process.exit(1);
    }
    importPlantsFromExcel(filePath)
      .then(result => {
        console.log('가져오기 완료:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('가져오기 실패:', error);
        process.exit(1);
      });
  } else {
    console.log('사용법:');
    console.log('템플릿 생성: npm run excel-import template');
    console.log('데이터 가져오기: npm run excel-import import <파일경로>');
  }
}