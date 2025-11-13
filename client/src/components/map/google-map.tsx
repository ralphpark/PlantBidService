import { useState, useRef, useCallback, useEffect, createElement, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, MapPin, Store } from 'lucide-react';
import { GoogleMap, Circle, Libraries } from '@react-google-maps/api';
import { useGoogleMaps } from './map-provider';

// 전역 window 타입을 확장하여 google 객체가 정의되어 있는지 확인
declare global {
  interface Window {
    google: any;
  }
}

interface GoogleMapComponentProps {
  onLocationSelect?: (location: { lat: number; lng: number; address: string; radius: number }) => void;
  height?: string;
  width?: string;
  className?: string;
  showSearchBar?: boolean;
  showRadiusControl?: boolean;
  showLocationInfo?: boolean;
  initialLocation?: { lat: number; lng: number; address: string; radius: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// 서울 중심 좌표 (기본값)
const defaultCenter = {
  lat: 37.5665,
  lng: 126.9780,
};

// 지도 옵션
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  mapId: '',  // 고급 마커를 사용하지 않으므로 mapId는 비워둠
};

// 원 스타일
const circleOptions = {
  strokeColor: '#5046e4',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#5046e4',
  fillOpacity: 0.2,
  clickable: false,
  draggable: false,
  editable: false,
  visible: true,
  zIndex: 1,
};

function GoogleMapWrapper({
  onLocationSelect,
  height = '300px',
  width = '100%',
  className = '',
  showSearchBar = true,
  showRadiusControl = true,
  showLocationInfo = true,
  initialLocation,
}: GoogleMapComponentProps) {
  const { toast } = useToast();
  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMaps();
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [address, setAddress] = useState<string>(initialLocation?.address || '');
  const [inputAddress, setInputAddress] = useState<string>('');
  const [radius, setRadius] = useState<number>(initialLocation?.radius || 3);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [nearbyVendors, setNearbyVendors] = useState<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false); 
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<{ [key: string]: any }>({});
  
  // 지도 준비 상태 확인
  useEffect(() => {
    if (isLoaded && window.google && window.google.maps) {
      console.log('Google Maps API is ready to use');
      setMapLoaded(true);
    }
  }, [isLoaded]);
  
  // Google Maps API가 로드되었는지 확인하기 위한 추가 체크

  // 맵 참조 저장
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 반경 내 판매자 가져오기
  const fetchNearbyVendors = useCallback(async (lat: number, lng: number, radiusKm: number) => {
    try {
      const response = await fetch(`/api/map/nearby-vendors?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
      if (!response.ok) {
        throw new Error('판매자 검색 중 오류가 발생했습니다');
      }
      
      const data = await response.json();
      console.log("근처 판매자 정보:", data);
      setNearbyVendors(data.vendors || []);
      
      return data.vendors || [];
    } catch (error) {
      console.error('판매자 검색 오류:', error);
      toast({
        title: '판매자 검색 오류',
        description: '주변 판매자를 검색하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  // 마커 생성 함수
  const createAdvancedMarker = useCallback((position: google.maps.LatLngLiteral, id: string, isMainMarker: boolean = false, vendorInfo?: any) => {
    if (!mapRef.current || !isLoaded) return null;

    // 기존 마커가 있으면 제거
    if (markerRefs.current[id]) {
      markerRefs.current[id].map = null;
      delete markerRefs.current[id];
    }

    try {
      // 항상 일반 마커만 사용 - 고급 마커 없이 사용 가능
      const advancedMarker = new google.maps.Marker({
        map: mapRef.current,
        position,
        title: isMainMarker ? '선택 위치' : vendorInfo?.storeName || vendorInfo?.name || '판매자 위치',
        icon: {
          url: isMainMarker 
            ? 'https://maps.google.com/mapfiles/ms/icons/homegardenbusiness.png'
            : 'https://maps.google.com/mapfiles/ms/icons/tree.png'
        },
        animation: isMainMarker ? google.maps.Animation.DROP : undefined
      });
      
      // 판매자 마커에 정보창 추가
      if (!isMainMarker && vendorInfo) {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="margin: 0 0 8px; font-weight: 500; font-size: 16px;">${vendorInfo.storeName || vendorInfo.name}</h3>
              <p style="margin: 0 0 4px; font-size: 13px; color: #666;">${vendorInfo.address}</p>
              <p style="margin: 0; font-size: 12px; color: #888;">거리: ${vendorInfo.distance}km</p>
            </div>
          `
        });
        
        // 마커 클릭 시 정보창 표시
        advancedMarker.addListener('click', () => {
          infoWindow.open(mapRef.current, advancedMarker);
        });
      }

      // 레퍼런스 저장
      markerRefs.current[id] = advancedMarker;
      
      return advancedMarker;
    } catch (error) {
      console.error('마커 생성 오류:', error);
      return null;
    }
  }, [isLoaded]);

  // 좌표에서 주소 가져오기 (역지오코딩)
  const getAddressFromLatLng = useCallback(async (lat: number, lng: number) => {
    if (!isLoaded) return '';
    
    try {
      const geocoder = new google.maps.Geocoder();
      const results = await geocoder.geocode({
        location: { lat, lng },
      });
      
      if (results.results && results.results.length > 0) {
        const addressResult = results.results[0].formatted_address;
        setAddress(addressResult);
        return addressResult;
      } else {
        throw new Error('주소를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: '주소 검색 실패',
        description: '위치의 주소를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return '';
    }
  }, [toast, isLoaded]);

  // 주소에서 좌표 찾기 (지오코딩)
  const searchAddress = useCallback(async () => {
    if (!inputAddress.trim() || !isLoaded) return;
    
    setIsSearching(true);
    
    try {
      const geocoder = new google.maps.Geocoder();
      const results = await geocoder.geocode({
        address: inputAddress,
      });
      
      if (results.results && results.results.length > 0) {
        const { location } = results.results[0].geometry;
        const newLoc = { lat: location.lat(), lng: location.lng() };
        
        // 맵 중심 이동
        if (mapRef.current) {
          mapRef.current.panTo(newLoc);
          mapRef.current.setZoom(14);
        }
        
        setSelectedLocation(newLoc);
        
        const addressResult = results.results[0].formatted_address;
        setAddress(addressResult);
        
        // 부모 컴포넌트에 위치 정보 전달 (비동기 실행으로 무한 루프 방지)
        if (onLocationSelect) {
          setTimeout(() => {
            onLocationSelect({
              lat: newLoc.lat,
              lng: newLoc.lng,
              address: addressResult,
              radius,
            });
          }, 0);
        }

        // 메인 마커 생성
        createAdvancedMarker(newLoc, 'main-marker', true);
        
        // 근처 판매자 정보 바로 가져오기 (검색 즉시 판매자 정보 표시)
        fetchNearbyVendors(newLoc.lat, newLoc.lng, radius);
      } else {
        toast({
          title: '주소 검색 실패',
          description: '입력한 주소를 찾을 수 없습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Address search error:', error);
      toast({
        title: '주소 검색 오류',
        description: '주소 검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [inputAddress, isLoaded, radius, onLocationSelect, toast, createAdvancedMarker, fetchNearbyVendors]);

  // 지도 클릭 이벤트 핸들러
  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !isLoaded) return;
    
    const clickedLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(clickedLoc);
    
    // 위치의 주소 검색
    const addressResult = await getAddressFromLatLng(clickedLoc.lat, clickedLoc.lng);
    
    // 주소 상태 업데이트 후 부모 컴포넌트에 위치 정보 전달
    setAddress(addressResult);
    
    // 메인 마커 생성
    createAdvancedMarker(clickedLoc, 'main-marker', true);
    
    // 부모 컴포넌트에 위치 정보 전달 (함수형 업데이트를 피함)
    if (onLocationSelect) {
      setTimeout(() => {
        onLocationSelect({
          lat: clickedLoc.lat,
          lng: clickedLoc.lng,
          address: addressResult,
          radius,
        });
        
        // 클릭 위치 기준으로 판매자 정보 가져오기
        fetchNearbyVendors(clickedLoc.lat, clickedLoc.lng, radius);
      }, 0);
    }
  }, [getAddressFromLatLng, radius, onLocationSelect, isLoaded, createAdvancedMarker, fetchNearbyVendors]);

  // 주소 검색 시 마커와 판매자 정보 가져오기
  const handleAddressSearch = useCallback(async () => {
    await searchAddress();
    
    // 위치 마커 및 판매자 정보 업데이트
    if (selectedLocation) {
      // 근처 판매자 가져오기
      fetchNearbyVendors(selectedLocation.lat, selectedLocation.lng, radius);
    }
  }, [searchAddress, selectedLocation, radius, fetchNearbyVendors]);

  // 반경 변경을 처리하는 함수
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    
    // 위치와 주소가 있는 경우 부모에게 알림 (비동기 실행으로 무한 루프 방지)
    if (selectedLocation && address && onLocationSelect) {
      setTimeout(() => {
        onLocationSelect({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address,
          radius: newRadius,
        });
        
        // 반경이 변경되었을 때 판매자 위치도 다시 가져오기
        fetchNearbyVendors(selectedLocation.lat, selectedLocation.lng, newRadius);
      }, 0);
    }
  }, [selectedLocation, address, onLocationSelect, fetchNearbyVendors]);

  // 지도가 로드되면 판매자 마커 표시
  useEffect(() => {
    // 위치와 마커가 모두 설정된 경우에만 실행
    if (selectedLocation && nearbyVendors.length > 0 && mapRef.current && isLoaded) {
      // 기존 판매자 마커 제거 (메인 마커 제외)
      Object.keys(markerRefs.current).forEach(key => {
        if (key !== 'main-marker') {
          if (markerRefs.current[key]) {
            markerRefs.current[key].map = null;
            delete markerRefs.current[key];
          }
        }
      });

      // 새 판매자 마커 추가
      nearbyVendors.forEach((vendor, index) => {
        console.log('판매자 정보:', vendor);
        if (vendor.lat && vendor.lng) {
          createAdvancedMarker(
            { lat: vendor.lat, lng: vendor.lng },
            `vendor-${vendor.id || index}`,
            false,
            vendor
          );
        }
      });
    }
  }, [nearbyVendors, selectedLocation, isLoaded, createAdvancedMarker]);

  // 로딩 에러 처리
  if (loadError) {
    return (
      <div 
        style={{ height, width }}
        className={`rounded-md border border-border flex flex-col items-center justify-center bg-muted/20 ${className}`}
      >
        <div className="text-center p-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="font-medium mb-1">지도를 로드할 수 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">
            구글 맵 API 연결에 문제가 발생했습니다.
          </p>
        </div>
      </div>
    );
  }
  
  // 로딩 중일 때 표시
  if (!isLoaded) {
    return (
      <div 
        style={{ height, width }}
        className={`rounded-md border border-border flex flex-col items-center justify-center bg-muted/20 ${className}`}
      >
        <div className="text-center p-4">
          <div className="flex justify-center items-center mb-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary/70" />
          </div>
          <h3 className="font-medium mb-1">지도 로딩 중</h3>
          <p className="text-sm text-muted-foreground mb-4">
            지도 리소스를 불러오는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* 주소 검색 - 조건부 렌더링 */}
      {showSearchBar && (
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="주소 검색 (예: 서울시 강남구)"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddressSearch();
                }
              }}
            />
          </div>
          <Button 
            onClick={handleAddressSearch} 
            disabled={isSearching || !inputAddress.trim()}
          >
            {isSearching ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                검색 중
              </div>
            ) : (
              "검색"
            )}
          </Button>
        </div>
      )}

      {/* 구글 맵 */}
      <div 
        style={{ height, width }}
        className={`rounded-md border border-border overflow-hidden relative ${className}`}
      >
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Loader2 className="h-12 w-12 animate-spin text-primary/70" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={13}
            options={mapOptions}
            onClick={onMapClick}
            onLoad={onMapLoad}
            id="google-map-container"
          >
            {selectedLocation && (
              <Circle
                center={selectedLocation}
                radius={radius * 1000} // km를 미터로 변환
                options={circleOptions}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* 반경 설정 슬라이더 - 조건부 렌더링 */}
      {showRadiusControl && (
        <div className="space-y-2 w-full">
          <div className="flex justify-between w-full">
            <p className="text-sm">반경 설정</p>
            <p className="text-sm font-medium">{radius} km</p>
          </div>
          <Slider
            min={0.2}
            max={30}
            step={0.1}
            value={[radius]}
            onValueChange={(values) => handleRadiusChange(values[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.2km</span>
            <span>15km</span>
            <span>30km</span>
          </div>
        </div>
      )}

      {/* 선택된 위치 정보 표시 - 조건부 렌더링 */}
      {showLocationInfo && selectedLocation && (
        <div className="bg-accent/30 p-3 rounded-md border w-full">
          <div className="flex items-start gap-2 w-full">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{address || '주소를 검색 중...'}</p>
              <p className="text-xs text-muted-foreground">반경 {radius}km 이내의 판매자들에게 요청합니다</p>
              
              {/* 판매자 정보 표시 */}
              {nearbyVendors.length > 0 ? (
                <p className="text-xs text-primary font-medium mt-1">
                  <Store className="h-3 w-3 inline-block mr-1" />
                  {nearbyVendors.length}개의 판매자가 이 지역에서 활동 중입니다
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  <Store className="h-3 w-3 inline-block mr-1" />
                  선택한 반경내에 판매 가능한 판매자가 없습니다. 반경을 더 넓혀보세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleMapWrapper;