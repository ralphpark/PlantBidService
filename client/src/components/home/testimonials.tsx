import React from "react";
import { motion } from "framer-motion";

type TestimonialProps = {
  rating: number;
  text: string;
  name: string;
  location: string;
  delay: number;
};

function Testimonial({ rating, text, name, location, delay }: TestimonialProps) {
  return (
    <motion.div
      className="bg-white p-8 rounded-xl shadow-md"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
    >
      <div className="flex items-center mb-4">
        <div className="text-accent">
          {Array.from({ length: Math.floor(rating) }).map((_, i) => (
            <svg
              key={i}
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 inline-block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          {rating % 1 !== 0 && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 inline-block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" 
              clipPath="inset(0 50% 0 0)"
              />
            </svg>
          )}
        </div>
      </div>
      <p className="text-gray-600 mb-6 italic">{text}</p>
      <div className="flex items-center">
        <div>
          <p className="font-sans font-semibold">{name}</p>
          <p className="text-sm text-gray-500">{location}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const testimonials = [
    {
      rating: 5,
      text: "\"AI 추천이 정말 정확했어요. 햇빛이 잘 들지 않는 제 방에 딱 맞는 식물을 추천해주었고, 여러 업체의 제안을 비교해 가장 좋은 조건으로 구매할 수 있었습니다.\"",
      name: "김지민",
      location: "서울 마포구",
    },
    {
      rating: 4.5,
      text: "\"식물 초보인 제게 관리하기 쉬운 식물을 추천해주었어요. 더불어 업체에서 관리 팁까지 자세히 알려주어 식물이 잘 자라고 있습니다.\"",
      name: "이승준",
      location: "부산 해운대구",
    },
    {
      rating: 5,
      text: "\"지인 선물용으로 식물을 찾고 있었는데, 몇 가지 질문에 답하니 딱 맞는 식물과 포장 옵션까지 제안 받을 수 있었어요. 정말 편리한 서비스입니다!\"",
      name: "박소영",
      location: "대전 유성구",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/50">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold text-primary mb-4">이용자 후기</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            PlantBid를 통해 새로운 식물을 만난 분들의 생생한 이야기를 들어보세요.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Testimonial
              key={index}
              rating={testimonial.rating}
              text={testimonial.text}
              name={testimonial.name}
              location={testimonial.location}
              delay={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
