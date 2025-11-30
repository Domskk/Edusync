import { motion } from 'framer-motion';

export function Button({children, onClick, className}: {children: React.ReactNode; onClick?: () => void; className?: string}) {
    return (
        <motion.button
        className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95}}
        onClick={onClick}
        >
            {children}
        </motion.button>
    )
}