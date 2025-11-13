import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

type Vendor = {
  id: number;
  name: string;
  storeName: string;
  rating?: string;
  address: string;
  color?: {
    bg: string;
    border: string;
  };
  description?: string;
};

export function VendorRecommendations({ vendors }: { vendors: Vendor[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 mt-2">
      {vendors.map((vendor, index) => (
        <Card key={vendor.id || `vendor-${index}`} className="overflow-hidden">
          <div className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{vendor.storeName}</div>
                <div className="text-xs text-gray-500 mt-1">{vendor.address}</div>
              </div>
              
              {vendor.rating && (
                <Badge variant="outline" className="flex items-center">
                  <StarIcon className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                  <span>{vendor.rating}</span>
                </Badge>
              )}
            </div>
            
            {vendor.description && (
              <div className="text-xs text-gray-700 mt-2">{vendor.description}</div>
            )}
            
            <Link href={`/vendor/${vendor.id}`}>
              <Button size="sm" variant="outline" className="w-full mt-3">
                판매자 보기
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}