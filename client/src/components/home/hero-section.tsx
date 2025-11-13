import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export function HeroSection() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-sans text-4xl md:text-5xl font-bold text-primary leading-tight mb-6">
              당신에게 맞는 <br className="hidden md:block" />
              <span className="text-accent">생활 속 자연</span>을 찾아드려요
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              AI가 환경과 목적에 맞는 식물을 추천하고, 
              지역 업체의 맞춤 제안까지 한 번에 받아보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="bg-primary text-white hover:bg-primary/90 transform transition-all duration-300 hover:-translate-y-1 font-sans font-semibold relative overflow-hidden"
                onClick={() => {
                  // 로그인 여부에 따라 다른 페이지로 이동
                  if (user) {
                    navigate("/ai-consultation");
                  } else {
                    navigate("/auth");
                  }
                }}
              >
                인공지능 상담하기
                <span className="absolute inset-0 w-full h-full bg-white/30 opacity-0 group-hover:opacity-30 transform scale-0 group-hover:scale-100 rounded-full transition-all duration-300 ease-in-out pointer-events-none"></span>
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="bg-transparent text-primary border border-primary hover:bg-secondary font-sans font-semibold"
                asChild
              >
                <a href="#process">
                  이용 방법 알아보기
                </a>
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            className="hero-image-container overflow-hidden rounded-2xl shadow-xl lg:ml-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="overflow-hidden rounded-2xl">
              <motion.img 
                src="https://images.unsplash.com/photo-1545165375-1b744b9ed444?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="식물이 있는 밝은 실내 공간" 
                className="w-full h-auto object-cover aspect-[4/3]"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 8 }}
              />
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-1/4 right-0 w-64 h-64 bg-secondary rounded-full filter blur-3xl opacity-50 -z-10"></div>
      <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-accent/20 rounded-full filter blur-3xl opacity-30 -z-10"></div>
    </section>
  );
}
