'use client';

import { motion } from 'framer-motion';
import { Bird } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Bird size={48} className="text-[var(--color-secondary)]" />
      </motion.div>

      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-display)] text-lg font-medium">
          bird watching&hellip;
        </p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--color-secondary)]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
