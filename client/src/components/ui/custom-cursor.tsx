import React, { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <motion.div
      className="fixed w-6 h-6 bg-primary/20 rounded-full pointer-events-none z-50"
      style={{ 
        x: mousePosition.x, 
        y: mousePosition.y,
        translateX: "-50%",
        translateY: "-50%"
      }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    />
  );
}
