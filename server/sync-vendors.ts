// 판매자 계정 동기화 스크립트
// vendors 테이블에 없는 vendor 역할의 사용자를 추가하는 유틸리티

import { db } from './db';
import { eq, isNull } from 'drizzle-orm';
import { users, vendors } from '@shared/schema';
import { generateRandomColor } from './utils/color-generator';

export async function syncVendorsTable() {
  console.log("판매자 데이터 동기화 시작...");
  
  try {
    // 판매자 역할을 가진 모든 사용자 조회
    const vendorUsers = await db.select()
      .from(users)
      .where(eq(users.role, 'vendor'));
    
    console.log(`판매자 역할을 가진 사용자 ${vendorUsers.length}명 발견`);
    
    // 각 판매자에 대해 vendors 테이블에 존재하는지 확인
    let syncCount = 0;
    for (const user of vendorUsers) {
      // vendors 테이블에서 해당 사용자 ID로 이미 있는지 확인
      const existingVendor = await db.select()
        .from(vendors)
        .where(eq(vendors.id, user.id))
        .limit(1);
      
      // vendors 테이블에 해당 레코드가 없으면 생성
      if (existingVendor.length === 0) {
        // 사업자 주소 정보 가져오기 (옵션)
        const addressInfo = user.address ? 
          (user.zipCode ? `${user.address} (${user.zipCode})` : user.address) : 
          "주소 정보 없음";
        
        // 임의의 색상 생성
        const color = generateRandomColor();
        
        // vendors 테이블에 레코드 생성
        await db.insert(vendors)
          .values({
            id: user.id, // ID를 명시적으로 설정하여 같은 ID 사용
            name: user.name || user.username || "판매자", // 판매자 이름
            email: `${user.email}-vendor-${user.id}`, // 고유한 이메일 주소 생성
            phone: user.phone || "정보 없음",
            storeName: user.storeName || "심다 플랜트", // 상호명 사용
            address: addressInfo,
            description: user.bio || "식물을 위한 작업실 심다",
            color: color // 랜덤 색상 할당
          });
        
        console.log(`판매자 [${user.username}](ID: ${user.id})가 vendors 테이블에 추가되었습니다.`);
        syncCount++;
      } else {
        console.log(`판매자 [${user.username}](ID: ${user.id})는 이미 vendors 테이블에 존재합니다.`);
      }
    }
    
    // 색상이 없는 기존 판매자들에게 색상 할당
    await updateVendorColors();
    
    console.log(`판매자 동기화 완료: ${syncCount}명의 판매자가 추가되었습니다.`);
    return syncCount;
  } catch (error) {
    console.error("판매자 동기화 중 오류 발생:", error);
    throw error;
  }
}

/**
 * 색상이 없는 판매자들에게 색상을 할당합니다
 */
export async function updateVendorColors() {
  try {
    // 모든 판매자 조회
    const allVendors = await db.select().from(vendors);
    
    // 색상이 없는 판매자 필터링
    const vendorsWithoutColor = allVendors.filter(vendor => !vendor.color);
    
    if (vendorsWithoutColor.length === 0) {
      console.log("모든 판매자에게 색상이 이미 할당되어 있습니다.");
      return;
    }
    
    console.log(`색상이 없는 판매자 ${vendorsWithoutColor.length}명 발견`);
    
    // 이미 사용 중인 색상 이름 추출
    const existingColors = allVendors
      .filter(vendor => vendor.color)
      .map(vendor => {
        const match = vendor.color?.bg?.match(/bg-([a-z]+)-\d+/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];
    
    // 각 판매자에게 고유한 색상 할당
    for (const vendor of vendorsWithoutColor) {
      const color = generateRandomColor(existingColors);
      
      if (color) {
        await db.update(vendors)
          .set({ color })
          .where(eq(vendors.id, vendor.id));
        
        console.log(`판매자 [ID: ${vendor.id}]에게 새 색상 할당: ${color.bg}`);
        
        // 사용된 색상 추적
        if (color.bg) {
          const colorName = color.bg.match(/bg-([a-z]+)-\d+/)?.[1];
          if (colorName) {
            existingColors.push(colorName);
          }
        }
      }
    }
    
    console.log(`${vendorsWithoutColor.length}명의 판매자에게 색상 할당 완료`);
  } catch (error) {
    console.error("판매자 색상 업데이트 중 오류 발생:", error);
  }
}