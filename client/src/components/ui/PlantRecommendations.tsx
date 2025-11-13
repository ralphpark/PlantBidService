import React from 'react';
import { Card } from '@/components/ui/card';

type PlantRecommendation = {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  price?: string;
};

export function PlantRecommendations({ recommendations }: { recommendations: PlantRecommendation[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {recommendations.map((plant, index) => (
        <Card key={plant.id || `plant-${index}`} className="overflow-hidden flex flex-col">
          <div className="h-32 bg-gray-100 relative">
            <img
              src={plant.imageUrl}
              alt={plant.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3">
            <div className="font-medium">{plant.name}</div>
            <div className="text-xs text-gray-500 my-1 line-clamp-2">{plant.description}</div>
            {plant.price && (
              <div className="text-sm font-semibold text-green-600 mt-1">
                {parseInt(plant.price).toLocaleString()}원
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}