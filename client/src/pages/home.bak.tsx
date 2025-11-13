import React, { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { ProcessSection } from "@/components/home/process-section";
import { PlantShowcase } from "@/components/home/plant-showcase";
import { Testimonials } from "@/components/home/testimonials";
import { CtaSection } from "@/components/home/cta-section";
import { CustomCursor } from "@/components/ui/custom-cursor";

export default function Home() {
  useEffect(() => {
    document.title = "PlantBid by simda - AI 기반 맞춤 식물 추천 & 지역 입찰형 판매 서비스";
  }, []);

  return (
    <div className="font-sans text-gray-800 min-h-screen">
      <CustomCursor />
      <Header />
      <main className="overflow-hidden">
        <HeroSection />
        <FeaturesSection />
        <ProcessSection />
        <PlantShowcase />
        <Testimonials />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}