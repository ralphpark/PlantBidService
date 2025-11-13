import React, { useState, useCallback, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MapPin } from "lucide-react";

// 간소화된 위치 데이터 타입
interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

// 로컬 스토리지 키
const VENDOR_LOCATION_KEY = 'vendor_location';

export default function LocationSettings() {
  // 위치 정보 상태
  const [location, setLocation] = useState<LocationData>({
    lat: 37.5665,
    lng: 126.9780,
    address: '서울특별시 중구 세종대로 110'
  });
  
  // 데이터 로딩 상태
  const [dataLoading, setDataLoading] = useState(true);
  
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState("");
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState("");
  
  // 저장 성공 상태
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 초기 위치 데이터 로딩
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setDataLoading(true);
        const response = await fetch('/api/store-location');
        
        if (response.ok) {
          const locationData = await response.json();
          setLocation({
            lat: locationData.lat,
            lng: locationData.lng,
            address: locationData.address
          });
        } else if (response.status === 404) {
          // 위치 정보가 없는 경우 기본값 유지
          console.log('매장 위치 정보가 없습니다. 기본값을 사용합니다.');
        } else {
          console.error('매장 위치 정보를 가져오는 중 오류 발생:', response.statusText);
        }
      } catch (error) {
        console.error('매장 위치 정보를 가져오는 중 오류 발생:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchLocation();
  }, []);

  // Google Maps API 키 및 지도 URL 생성
  useEffect(() => {
    // API 키 가져오기
    fetch('/api/map/config')
      .then(response => response.json())
      .then(data => {
        if (data.googleMapsApiKey) {
          const url = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=15&size=600x400&markers=color:red%7C${location.lat},${location.lng}&key=${data.googleMapsApiKey}`;
          setMapUrl(url);
        }
      })
      .catch(error => {
        console.error('Error fetching Google Maps API key:', error);
      });
  }, [location]);
  
  // 저장 성공 메시지 타이머
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);
  
  // 검색어로 주소 검색 함수
  const searchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/map/search-address?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success && data.results.length > 0) {
        const result = data.results[0];
        
        // 좌표 및 주소 설정
        setLocation({
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address || result.name
        });
      } else {
        alert('검색 결과가 없습니다.');
      }
    } catch (error) {
      console.error('위치 검색 오류:', error);
      alert('위치 검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);
  
  // 검색 입력 처리
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };
  
  // 저장 핸들러
  const handleSave = async () => {
    try {
      // 저장 중 상태 표시
      setIsLoading(true);
      
      // API에 저장할 데이터 구성
      const locationData = {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        storeName: location.address.split(' ').slice(0, 2).join(' '), // 시/도 + 구/군
        radius: 5 // 기본 반경 5km
      };
      
      // API 저장 요청
      const response = await fetch('/api/store-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });
      
      if (response.ok) {
        // 성공 상태 표시
        setSaveSuccess(true);
      } else {
        const errorData = await response.json();
        alert('매장 위치 저장 중 오류가 발생했습니다: ' + (errorData.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('매장 위치 저장 오류:', error);
      alert('매장 위치 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* 구글 검색 필드 */}
      <div className="space-y-2">
        <Label>위치 검색</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="주소나 장소를 검색하세요 (예: 강남역, 서울시 강남구 테헤란로 ...)"
              className="pl-9"
            />
          </div>
          <Button onClick={searchLocation} type="button" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            검색
          </Button>
        </div>
      </div>
      
      {/* 저장 성공 메시지 */}
      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <div className="mr-2 flex-shrink-0">✅</div>
          <div>매장 위치가 성공적으로 저장되었습니다.</div>
        </div>
      )}
      
      {/* 선택된 주소 표시 */}
      <div className="p-3 bg-muted/30 rounded-md">
        <div className="font-medium text-sm mb-1">선택된 위치:</div>
        <div>{location.address}</div>
        <div className="text-xs text-muted-foreground mt-1">
          좌표: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </div>
      </div>
      
      {/* 정적 지도 표시 */}
      <div className="border rounded-md p-2 h-[400px] relative overflow-hidden">
        {mapUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={mapUrl} 
              alt="선택한 매장 위치" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-white p-2 rounded-md text-xs text-muted-foreground shadow-md">
          지도는 참고용 이미지입니다. 정확한 위치는 주소 검색으로 지정해 주세요.
        </div>
      </div>
      
      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : '저장'}
        </Button>
      </div>
    </div>
  );
}