import { motion } from "framer-motion";
import { ABOUT_PARAGRAPHS } from "../content";

type AboutRevealCardProps = {
  revealed: boolean;
  variant?: "dark" | "light" | "ember" | "ocean" | "smoke";
  className?: string;
};

const variantStyles = {
  dark: "cin-card cin-card--dark",
  light: "cin-card cin-card--light",
  ember: "cin-card cin-card--ember",
  ocean: "cin-card cin-card--ocean",
  smoke: "cin-card cin-card--smoke",
};

export default function AboutRevealCard({
  revealed,
  variant = "dark",
  className = "",
}: AboutRevealCardProps) {
  if (!revealed) return null;

  return (
    <motion.div
      className={`${variantStyles[variant]} ${className}`}
      initial={{ opacity: 0, y: 28, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="cin-card__glow pointer-events-none absolute inset-0"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.4 }}
      />
      <motion.div className="relative z-10 space-y-5 px-7 py-8 sm:px-10 sm:py-10">
        {ABOUT_PARAGRAPHS.map((text, i) => (
          <motion.p
            key={i}
            className={i === 0 ? "cin-card__lead" : "cin-card__body"}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15 + i * 0.12,
              duration: 0.85,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {text}
          </motion.p>
        ))}
      </motion.div>
    </motion.div>
  );
}
