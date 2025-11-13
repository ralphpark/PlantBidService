import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type ProcessStepProps = {
  number: number;
  title: string;
  description: string;
  image: string;
  alt: string;
  delay: number;
};

function ProcessStep({ number, title, description, image, alt, delay }: ProcessStepProps) {
  return (
    <motion.div
      className="bg-white p-8 rounded-xl shadow-md relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
    >
      <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-sans font-bold">
        {number}
      </div>
      <h3 className="font-sans text-xl font-semibold mb-4 mt-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <motion.img
        src={image}
        alt={alt}
        className="w-full h-auto rounded-lg mt-4"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

export function ProcessSection() {
  const steps = [
    {
      number: 1,
      title: "대화형 AI 상담",
      description: "전문가와 대화하듯 AI가 환경, 취향, 관리 수준 등을 자연스럽게 질문합니다.",
      image: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
      alt: "AI 대화 화면",
    },
    {
      number: 2,
      title: "맞춤형 식물 추천",
      description: "대화를 통해 수집된 정보를 바탕으로 최적의 식물을 실시간으로 추천받습니다.",
      image: "https://images.unsplash.com/photo-1463320898484-cdee8141c787?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
      alt: "식물 추천 결과 화면",
    },
    {
      number: 3,
      title: "지역 업체 견적 비교",
      description: "선택한 식물에 대해 지역 업체들의 맞춤 제안을 비교하고 선택합니다.",
      image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
      alt: "업체 제안 비교 화면",
    },
  ];

  return (
    <section id="process" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/50">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-primary mb-4">대화형 AI로 쉽게 시작하기</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            양식 작성 없이, 실제 전문가와 상담하듯 자연스러운 대화를 통해 맞춤형 식물을 추천받습니다.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <ProcessStep
              key={index}
              number={step.number}
              title={step.title}
              description={step.description}
              image={step.image}
              alt={step.alt}
              delay={index + 1}
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
            size="lg"
            className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 shadow-md font-sans font-semibold"
            asChild
          >
            <a href="#features">지금 시작하기</a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
