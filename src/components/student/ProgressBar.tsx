import { motion } from 'framer-motion';

export function ProgressBar({ points }: { points: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <motion.div
        className="bg-blue-500 h-4 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(points, 100)}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}