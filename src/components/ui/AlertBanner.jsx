import { motion, AnimatePresence } from "framer-motion";

export default function AlertBanner({ error, info }) {
  return (
    <AnimatePresence>
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-5 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 text-center font-bold text-white/95 backdrop-blur"
        >
          {error}
        </motion.div>
      ) : null}

      {info ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-5 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-center font-semibold text-emerald-100 backdrop-blur"
        >
          {info}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
