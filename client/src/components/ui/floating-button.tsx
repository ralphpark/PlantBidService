import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';

interface FloatingButtonProps extends ButtonProps {
  hoverScale?: number;
  glowOnHover?: boolean;
}

export function FloatingButton({
  children,
  hoverScale = 1.05,
  glowOnHover = true,
  className = '',
  ...props
}: FloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      style={{ display: 'inline-block' }}
    >
      <Button
        className={`relative overflow-hidden ${className}`}
        {...props}
      >
        {children}
        
        {/* 호버 시 발광 효과 */}
        {glowOnHover && isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              boxShadow: '0 0 15px 3px rgba(255,255,255,0.3)',
            }}
            transition={{ duration: 0.3 }}
          />
        )}
      </Button>
    </motion.div>
  );
}
