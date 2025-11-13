import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export function CtaSection() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-primary text-white relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-sans text-3xl md:text-4xl font-bold mb-6">
            맞춤 식물과 함께하는 새로운 시작
          </h2>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            나에게 꼭 맞는 식물을 찾고, 최적의 조건으로 구매하세요.
            PlantBid가 여러분의 공간에 자연의
            싱그러움을 더해드립니다.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-neutral transition-all duration-300 shadow-lg font-sans font-semibold px-10"
                onClick={() => {
                  // 로그인 여부에 따라 다른 페이지로 이동
                  if (user) {
                    navigate("/ai-consultation");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                인공지능 상담 시작하기
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary transition-all duration-300 shadow-lg font-sans font-semibold px-10"
                onClick={() => {
                  if (user) {
                    navigate("/recommendation");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                식물 추천 마법사
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent rounded-full filter blur-3xl"></div>
      </div>
    </section>
  );
}
