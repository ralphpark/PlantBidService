import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

type Location = {
  lat: number;
  lng: number;
  address: string;
};

export function MapLocationInfo({ location }: { location: Location }) {
  const handleViewMap = () => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="border rounded-md p-3 bg-blue-50">
      <div className="flex items-start">
        <MapPin className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-sm">위치</div>
          <div className="text-sm text-gray-700 mt-1">{location.address}</div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={handleViewMap}
      >
        지도에서 보기
      </Button>
    </div>
  );
}