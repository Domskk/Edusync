import { motion } from 'framer-motion';

export function Badge({ name }: { name: string }) {
  return (
    <motion.span
      className="px-3 py-1 bg-yellow-400 text-black rounded-full text-sm"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {name}
    </motion.span>
  );
}