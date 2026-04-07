'use client';

import { motion } from 'framer-motion';
import { Bird } from 'lucide-react';

export default function LoadingBirdAnimation({ size = 48 }: { size?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Bird size={size} className="text-[var(--color-secondary)]" />
    </motion.div>
  );
}
