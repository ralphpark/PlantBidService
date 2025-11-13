import axios from 'axios';
import { Request, Response } from 'express';
import { db } from './db';
import { storeLocations, users, products, vendors as vendorsTable } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';

// Google Maps API 키
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 디버깅을 위한 로깅
console.log('Map API Keys:');
console.log('Google Maps API Key length:', GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.length : 0);

// Google Maps API 설정 가져오기
export function getMapConfig(req: Request, res: Response) {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API key is not configured' });
  }
  
  return res.json({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });
}

// 주소 검색 (지오코딩)
export async function searchAddressByQuery(req: Request, res: Response) {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: '검색어가 필요합니다.' });
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API key is not configured' });
  }
  
  try {
    console.log(`구글 지도 API 호출 - 검색어: "${query}"`);
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: query,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko' // 한국어로 결과 받기
      }
    });
    
    // 결과 확인
    const result = response.data;
    
    if (result.status === 'OK' && result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      const location = firstResult.geometry.location;
      
      // 우편번호 찾기
      let postal_code = '';
      if (firstResult.address_components) {
        for (const component of firstResult.address_components) {
          if (component.types.includes('postal_code')) {
            postal_code = component.long_name;
            break;
          }
        }
      }
      
      return res.json({
        success: true,
        results: result.results.map((item: any) => ({
          geometry: item.geometry,
          formatted_address: item.formatted_address,
          name: item.formatted_address,
          postal_code: postal_code
        }))
      });
    } else {
      // 결과가 없는 경우
      return res.json({
        success: false,
        error: '검색 결과가 없습니다.',
        googleStatus: result.status
      });
    }
  } catch (error) {
    console.error('Google geocoding error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '구글 지도 API 호출 중 오류가 발생했습니다.' 
    });
  }
}

// 좌표로 주소 검색 (역지오코딩)
export async function getAddressByCoords(req: Request, res: Response) {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Google Maps API key is not configured' });
  }
  
  try {
    console.log(`구글 지도 역지오코딩 API 호출 - 좌표: ${lat},${lng}`);
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko' // 한국어로 결과 받기
      }
    });
    
    // 결과 확인
    const result = response.data;
    
    if (result.status === 'OK' && result.results && result.results.length > 0) {
      // 결과 데이터 정리
      const results = result.results.map((item: any) => {
        // 우편번호 찾기
        let postal_code = '';
        if (item.address_components) {
          for (const component of item.address_components) {
            if (component.types.includes('postal_code')) {
              postal_code = component.long_name;
              break;
            }
          }
        }
        
        return {
          formatted_address: item.formatted_address,
          postal_code: postal_code,
          place_id: item.place_id,
          types: item.types
        };
      });
      
      return res.json({
        success: true,
        results: results
      });
    } else {
      // 결과가 없는 경우
      return res.json({
        success: false,
        error: '주소를 찾을 수 없습니다.',
        googleStatus: result.status
      });
    }
  } catch (error) {
    console.error('Google reverse geocoding error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '구글 지도 API 호출 중 오류가 발생했습니다.' 
    });
  }
}

// 근처 판매자 검색 (반경 내)
export async function findNearbyVendors(req: Request, res: Response) {
  const { lat, lng, radius } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
  }
  
  // 반경이 0이거나 매우 작은 값인 경우 최소 반경 0.2km(200m)로 설정
  let radiusKm = radius ? parseFloat(radius as string) : 5; // 기본 반경 5km
  radiusKm = radiusKm <= 0.2 ? 0.2 : radiusKm; // 최소 반경 보장
  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);
  
  try {
    // 데이터베이스에서 판매자 위치 정보 가져오기
    // storeLocations 테이블에서 위치 정보 가져오기
    
    // Haversine 공식을 사용하여 거리를 계산하는 SQL 쿼리
    const nearbyStoreLocations = await db.select({
      id: storeLocations.id,
      userId: storeLocations.userId,
      address: storeLocations.address,
      region: storeLocations.region,
      lat: storeLocations.lat,
      lng: storeLocations.lng,
      radius: storeLocations.radius,
      username: users.username,
      name: users.name,
      vendorStoreName: vendorsTable.storeName,
      // Haversine 공식을 사용하여 거리 계산 (km 단위)
      distance: sql<number>`
        (6371 * acos(
          cos(radians(${userLat})) * 
          cos(radians(${storeLocations.lat})) * 
          cos(radians(${storeLocations.lng}) - 
          radians(${userLng})) + 
          sin(radians(${userLat})) * 
          sin(radians(${storeLocations.lat}))
        ))`.as('distance')
    })
    .from(storeLocations)
    .leftJoin(users, eq(storeLocations.userId, users.id))
    .leftJoin(vendorsTable, eq(users.id, vendorsTable.id))
    .where(
      // 판매자 역할을 가진 사용자만 선택
      and(
        eq(users.role, 'vendor'),
        // 사용자의 서비스 반경보다 작은 거리에 있는 판매자만 선택
        sql<boolean>`
          (6371 * acos(
            cos(radians(${userLat})) * 
            cos(radians(${storeLocations.lat})) * 
            cos(radians(${storeLocations.lng}) - 
            radians(${userLng})) + 
            sin(radians(${userLat})) * 
            sin(radians(${storeLocations.lat}))
          )) <= ${radiusKm}`
      )
    )
    .orderBy(sql`distance`);

    console.log(`검색된 판매자 수: ${nearbyStoreLocations.length} (반경: ${radiusKm}km)`);
    if (nearbyStoreLocations.length > 0) {
      console.log('검색된 판매자 정보:', nearbyStoreLocations.map(store => ({
        id: store.userId,
        name: store.name || store.username, 
        distance: Number(store.distance.toFixed(1))
      })));
    }
    
    // 결과 변환
    const vendorResults = [];
    
    // 판매자별로 상품 정보 추가
    for (const store of nearbyStoreLocations) {
      // 해당 판매자의 상품 정보 가져오기
      const vendorProducts = await db.select()
        .from(products)
        .where(
          and(
            eq(products.userId, store.userId),
            eq(products.onlineStoreVisible, true) // 온라인 상점 노출용으로 설정된 상품만 가져오기
          )
        );
      
      vendorResults.push({
        id: store.userId,
        name: store.name || store.username || '이름 없음',
        storeName: store.vendorStoreName || `${store.name || store.username} 상점`,
        address: store.address,
        distance: Number(store.distance.toFixed(1)),
        lat: Number(store.lat),
        lng: Number(store.lng),
        region: store.region,
        products: vendorProducts, // 판매자의 상품 정보 추가
      });
    }
    
    return res.json({
      vendors: vendorResults,
      center: { lat: userLat, lng: userLng },
      radius: radiusKm,
    });
    
  } catch (error) {
    console.error('Find nearby vendors error:', error);
    return res.status(500).json({ error: '판매자 검색 중 오류가 발생했습니다.' });
  }
}