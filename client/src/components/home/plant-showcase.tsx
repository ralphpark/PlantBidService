import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type PlantCardProps = {
  image: string;
  name: string;
  description: string;
  price: string;
  proposals: number;
  index: number;
};

function PlantCard({ image, name, description, price, proposals, index }: PlantCardProps) {
  return (
    <motion.div
      className="bg-neutral rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
    >
      <motion.img
        src={image}
        alt={name}
        className="w-full h-64 object-cover"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      />
      <div className="p-6">
        <h3 className="font-sans text-xl font-semibold mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex justify-between items-center">
          <span className="font-sans font-semibold text-primary">{price}</span>
          <span className="text-xs text-gray-500">{proposals}개 업체 제안</span>
        </div>
      </div>
    </motion.div>
  );
}

export function PlantShowcase() {
  const plants = [
    {
      image: "https://images.unsplash.com/photo-1614594805320-e6a5549a8a0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      name: "몬스테라 델리시오사",
      description: "인테리어에 활력을 더하는 공기정화 식물",
      price: "35,000원~",
      proposals: 5,
    },
    {
      image: "https://images.unsplash.com/photo-1620127682229-33388276e540?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      name: "피스 릴리",
      description: "미니멀한 공간에 어울리는 우아한 식물",
      price: "28,000원~",
      proposals: 7,
    },
    {
      image: "https://images.unsplash.com/photo-1632320208754-2a7d75ae46d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      name: "스투키",
      description: "관리가 쉽고 공기 정화 효과가 뛰어난 선인장",
      price: "22,000원~",
      proposals: 9,
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-primary mb-4">인기 식물 미리보기</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            PlanB에서 가장 인기 있는 식물들을 만나보세요.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {plants.map((plant, index) => (
            <PlantCard
              key={index}
              image={plant.image}
              name={plant.name}
              description={plant.description}
              price={plant.price}
              proposals={plant.proposals}
              index={index}
            />
          ))}
        </div>
        
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            variant="outline"
            size="lg"
            className="bg-transparent text-primary border border-primary hover:bg-secondary transition-all duration-300 font-sans font-semibold"
            asChild
          >
            <a href="#features">더 많은 식물 보기</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
