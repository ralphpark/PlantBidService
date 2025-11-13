import { Pool, neonConfig } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import ws from 'ws';
import csv from 'csv-parser';
import { Readable } from 'stream';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Parse CSV file using csv-parser
async function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        skipLines: 1, // 첫 번째 행(헤더) 건너뛰기
        headers: [
          '식물 이름', '사진', '학명', '설명', '물주기', '빛', '습도', 
          '잘 자라는 온도', '겨울철 관리 온도\n', '특징 색상', '식물 유형', 
          '가시 유무', '잎 모양1', '잎 모양2', '잎 모양3', '잎 모양4', 
          '식물경험', '반려식물\n안전성', '유통 크기', '난이도', '유통가격',
          'field22', 'field23', 'field24', 'field25', 'field26', 'field27', 'field28'
        ],
        skipComments: true
      }))
      .on('data', (data) => {
        if (data['식물 이름'] && data['식물 이름'].trim()) {
          results.push(data);
        }
      })
      .on('end', () => {
        console.log(`CSV 파일에서 ${results.length}개의 행을 읽었습니다.`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('CSV 파싱 오류:', error);
        reject(error);
      });
  });
}

async function importPlantsFromCSV() {
  try {
    // Find CSV file path
    const csvPath = '/home/runner/workspace/attached_assets/plantdata_250420.csv';
    console.log(`CSV 파일 경로: ${csvPath}`);
    console.log(`파일 존재 여부: ${fs.existsSync(csvPath)}`);
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('CSV 파일을 찾을 수 없습니다.');
    }
    
    // Parse CSV
    const plants = await parseCSV(csvPath);
    console.log(`CSV 파일에서 ${plants.length}개의 행을 읽었습니다.`);
    
    if (plants.length === 0) {
      throw new Error('식물 데이터가 없습니다.');
    }

    console.log('첫 번째 행 샘플:', plants[0]);
    
    // 배치 처리를 위한 준비
    const batchSize = 50;
    const totalPlants = plants.length;
    let insertedCount = 0;
    
    // 배치 단위로 처리
    for (let batchStart = 0; batchStart < totalPlants; batchStart += batchSize) {
      const batch = plants.slice(batchStart, batchStart + batchSize);
      const batchValues = [];
      const batchPlantNames = [];

      // 각 식물 데이터를 배치에 추가
      for (const plant of batch) {
        // 이름 필드 확인
        if (!plant['식물 이름'] || plant['식물 이름'] === '식물 이름') {
          continue;
        }
        
        batchPlantNames.push(plant['식물 이름']);
        
        // 데이터 매핑
        const plantData = {
          name: plant['식물 이름'],
          imageUrl: plant['사진'] && plant['사진'] !== '사진' ? plant['사진'] : null,
          scientificName: plant['학명'] && plant['학명'] !== '학명' ? plant['학명'] : null,
          description: plant['설명'] && plant['설명'] !== '설명' ? plant['설명'] : null,
          waterNeeds: plant['물주기'] && plant['물주기'] !== '물주기' ? plant['물주기'] : null,
          light: plant['빛'] && plant['빛'] !== '빛' ? plant['빛'] : null,
          humidity: plant['습도'] && plant['습도'] !== '습도' ? plant['습도'] : null,
          temperature: plant['잘 자라는 온도'] && plant['잘 자라는 온도'] !== '잘 자라는 온도' ? plant['잘 자라는 온도'] : null,
          winterTemperature: plant['겨울철 관리 온도\n'] && plant['겨울철 관리 온도\n'] !== '겨울철 관리 온도\n' ? plant['겨울철 관리 온도\n'] : null,
          colorFeature: plant['특징 색상'] && plant['특징 색상'] !== '특징 색상' ? plant['특징 색상'] : null,
          plantType: plant['식물 유형'] && plant['식물 유형'] !== '식물 유형' ? plant['식물 유형'] : null,
          hasThorns: plant['가시 유무'] === 'O',
          leafShape1: plant['잎 모양1'] && plant['잎 모양1'] !== '잎 모양1' ? plant['잎 모양1'] : null,
          leafShape2: plant['잎 모양2'] && plant['잎 모양2'] !== '잎 모양2' ? plant['잎 모양2'] : null,
          leafShape3: plant['잎 모양3'] && plant['잎 모양3'] !== '잎 모양3' ? plant['잎 모양3'] : null,
          leafShape4: plant['잎 모양4'] && plant['잎 모양4'] !== '잎 모양4' ? plant['잎 모양4'] : null,
          experienceLevel: plant['식물경험'] && plant['식물경험'] !== '식물경험' ? plant['식물경험'] : null,
          petSafety: plant['반려식물\n안전성'] && plant['반려식물\n안전성'] !== '반려식물\n안전성' ? plant['반려식물\n안전성'] : null,
          size: plant['유통 크기'] && plant['유통 크기'] !== '유통 크기' ? plant['유통 크기'] : null,
          difficulty: plant['난이도'] && plant['난이도'] !== '난이도' ? plant['난이도'] : null,
          priceRange: plant['유통가격'] && plant['유통가격'] !== '유통가격' ? plant['유통가격'] : null,
          careInstructions: 
            `물주기: ${plant['물주기'] && plant['물주기'] !== '물주기' ? plant['물주기'] : '정보 없음'}\n` +
            `빛: ${plant['빛'] && plant['빛'] !== '빛' ? plant['빛'] : '정보 없음'}\n` +
            `습도: ${plant['습도'] && plant['습도'] !== '습도' ? plant['습도'] : '정보 없음'}\n` +
            `온도: ${plant['잘 자라는 온도'] && plant['잘 자라는 온도'] !== '잘 자라는 온도' ? plant['잘 자라는 온도'] : '정보 없음'}\n` +
            `겨울철 온도: ${plant['겨울철 관리 온도\n'] && plant['겨울철 관리 온도\n'] !== '겨울철 관리 온도\n' ? plant['겨울철 관리 온도\n'] : '정보 없음'}`,
          category: plant['식물 유형'] && plant['식물 유형'] !== '식물 유형' ? plant['식물 유형'] : '실내식물',
        };
        
        // 배치에 추가
        batchValues.push([
          plantData.name, plantData.imageUrl, plantData.scientificName, plantData.description, plantData.waterNeeds,
          plantData.light, plantData.humidity, plantData.temperature, plantData.winterTemperature, plantData.colorFeature,
          plantData.plantType, plantData.hasThorns, plantData.leafShape1, plantData.leafShape2, plantData.leafShape3,
          plantData.leafShape4, plantData.experienceLevel, plantData.petSafety, plantData.size, plantData.difficulty,
          plantData.priceRange, plantData.careInstructions, plantData.category
        ]);
      }
      
      // 배치에 데이터가 있으면 삽입
      if (batchValues.length > 0) {
        try {
          // 배치 삽입을 위한 쿼리 구성
          const placeholders = batchValues.map((_, i) => 
            `($${i * 23 + 1}, $${i * 23 + 2}, $${i * 23 + 3}, $${i * 23 + 4}, $${i * 23 + 5}, 
              $${i * 23 + 6}, $${i * 23 + 7}, $${i * 23 + 8}, $${i * 23 + 9}, $${i * 23 + 10}, 
              $${i * 23 + 11}, $${i * 23 + 12}, $${i * 23 + 13}, $${i * 23 + 14}, $${i * 23 + 15}, 
              $${i * 23 + 16}, $${i * 23 + 17}, $${i * 23 + 18}, $${i * 23 + 19}, $${i * 23 + 20}, 
              $${i * 23 + 21}, $${i * 23 + 22}, $${i * 23 + 23})`
          ).join(', ');
          
          const query = `
            INSERT INTO plants (
              name, image_url, scientific_name, description, water_needs, 
              light, humidity, temperature, winter_temperature, color_feature, 
              plant_type, has_thorns, leaf_shape1, leaf_shape2, leaf_shape3, 
              leaf_shape4, experience_level, pet_safety, size, difficulty, 
              price_range, care_instructions, category
            ) VALUES ${placeholders}
          `;
          
          // 배치 데이터를 1차원 배열로 변환
          const flatValues = batchValues.reduce((acc, val) => acc.concat(val), []);
          
          // 쿼리 실행
          await pool.query(query, flatValues);
          
          insertedCount += batchValues.length;
          console.log(`${insertedCount}/${totalPlants} 식물 데이터 삽입 완료 (${batchPlantNames.join(', ')})`);
        } catch (error) {
          console.error(`배치 삽입 중 오류:`, error);
          
          // 개별 삽입으로 대체
          console.log('개별 삽입 시도 중...');
          
          for (let i = 0; i < batchValues.length; i++) {
            try {
              const query = `
                INSERT INTO plants (
                  name, image_url, scientific_name, description, water_needs, 
                  light, humidity, temperature, winter_temperature, color_feature, 
                  plant_type, has_thorns, leaf_shape1, leaf_shape2, leaf_shape3, 
                  leaf_shape4, experience_level, pet_safety, size, difficulty, 
                  price_range, care_instructions, category
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
              `;
              
              await pool.query(query, batchValues[i]);
              insertedCount++;
              
              console.log(`${insertedCount}/${totalPlants} 개별 식물 데이터 삽입 완료 (${batchPlantNames[i]})`);
            } catch (error) {
              console.error(`식물 ${batchPlantNames[i]} 개별 삽입 중 오류:`, error);
            }
          }
        }
      }
    }
    
    // Count inserted plants
    const countResult = await pool.query('SELECT COUNT(*) FROM plants');
    const count = parseInt(countResult.rows[0].count);
    console.log(`총 ${count}개의 식물 데이터가 데이터베이스에 저장되었습니다.`);
    
  } catch (error) {
    console.error('식물 데이터 가져오기 오류:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

importPlantsFromCSV();