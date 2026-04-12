'use client';

import { motion } from 'framer-motion';
import { Bird } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export default function LoadingBirdAnimation({ size = 48 }: { size?: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <Bird size={size} className="text-[var(--color-secondary)]" />;
  }

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Bird size={size} className="text-[var(--color-secondary)]" />
    </motion.div>
  );
}
