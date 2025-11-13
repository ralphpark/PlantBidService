// 판매자를 위한 색상 생성 유틸리티

// Tailwind 색상 팔레트
const COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 
  'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
];

// 색상 강도 (50이 가장 밝음, 보통 배경으로 사용)
const BG_INTENSITY = 50;
const BORDER_INTENSITY = 200;

// 판매자가 사용 중인 색상을 추적
const usedColors = new Set<string>();

/**
 * 사용 가능한 색상을 가져옵니다.
 * 이미 할당된 색상은 제외합니다.
 */
function getAvailableColors(existingColors: string[]): string[] {
  // 이미 사용 중인 색상 추적
  existingColors.forEach(color => {
    if (color) usedColors.add(color);
  });
  
  // 아직 사용되지 않은 색상 필터링
  return COLORS.filter(color => !usedColors.has(color));
}

/**
 * 랜덤 색상을 생성합니다.
 * @param existingColors 이미 사용 중인 색상 목록
 * @returns 색상 객체 또는 undefined (더 이상 사용 가능한 색상이 없는 경우)
 */
export function generateRandomColor(existingColors: string[] = []): { bg: string, border: string } | undefined {
  const availableColors = getAvailableColors(existingColors);
  
  // 모든 색상이 사용 중인 경우, 가장 사용 빈도가 낮은 색상을 재사용
  if (availableColors.length === 0) {
    // 모든 색상을 사용 가능하게 초기화
    usedColors.clear();
    return generateRandomColor(existingColors);
  }
  
  // 랜덤하게 색상 선택
  const randomIndex = Math.floor(Math.random() * availableColors.length);
  const colorName = availableColors[randomIndex];
  
  // 해당 색상 사용 중으로 표시
  usedColors.add(colorName);
  
  return {
    bg: `bg-${colorName}-${BG_INTENSITY}`,
    border: `border-${colorName}-${BORDER_INTENSITY}`
  };
}

/**
 * 모든 판매자에게 색상을 할당합니다
 * @param vendors 판매자 목록
 * @returns 색상이 할당된 판매자 목록
 */
export function assignColorsToVendors(vendors: any[]): any[] {
  // 이미 색상이 할당된 판매자들의 색상 이름 추출
  const existingColors = vendors
    .filter(vendor => vendor.color)
    .map(vendor => {
      // "bg-red-50"에서 "red" 추출하기
      const match = vendor.color.bg?.match(/bg-([a-z]+)-\d+/);
      return match ? match[1] : null;
    })
    .filter(Boolean); // null/undefined 제거
  
  // 각 판매자에게 색상 할당
  return vendors.map(vendor => {
    // 이미 색상이 있는 경우 그대로 유지
    if (vendor.color) return vendor;
    
    // 새 색상 할당
    const color = generateRandomColor(existingColors);
    return { ...vendor, color };
  });
}