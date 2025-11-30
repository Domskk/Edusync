import { motion } from 'framer-motion';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            className={`bg-white p-6 rounded-lg shadow-md ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3}}
        >
            {children}
        </motion.div>
    );
}