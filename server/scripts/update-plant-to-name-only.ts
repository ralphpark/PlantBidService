import { db, pool } from "../db";
import { sql } from "drizzle-orm";

async function updatePlantTable() {
  try {
    console.log("식물 테이블에서 이름만 남기고 다른 필드 정리 시작...");
    
    // 이름과 이미지 URL만 남기고 다른 모든 필드 NULL로 설정
    await db.execute(sql`
      UPDATE plants 
      SET 
        scientific_name = NULL,
        description = NULL,
        water_needs = NULL,
        light = NULL,
        humidity = NULL,
        temperature = NULL,
        winter_temperature = NULL,
        color_feature = NULL,
        plant_type = NULL, 
        category = NULL,
        has_thorns = NULL,
        leaf_shape1 = NULL,
        leaf_shape2 = NULL,
        leaf_shape3 = NULL,
        leaf_shape4 = NULL,
        experience_level = NULL,
        pet_safety = NULL,
        size = NULL,
        difficulty = NULL,
        price_range = NULL,
        care_instructions = NULL
    `);

    console.log("식물 테이블 업데이트 완료!");
    
    // 남은 식물 이름 개수 확인
    const result = await db.execute(sql`SELECT COUNT(*) FROM plants`);
    console.log(`식물 이름 데이터: ${result.rows[0].count}개 유지됨`);
    
    // 몇 개 샘플 출력
    const samples = await db.execute(sql`SELECT id, name, image_url FROM plants LIMIT 5`);
    console.log("샘플 데이터:");
    console.log(samples.rows);
    
  } catch (error) {
    console.error("식물 테이블 업데이트 오류:", error);
  } finally {
    await pool.end();
  }
}

updatePlantTable()
  .then(() => console.log("스크립트 실행 완료"))
  .catch(error => console.error("스크립트 실행 오류:", error));