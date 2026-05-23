import type { CSSProperties, ReactNode } from "react";
import ElectricBorder from "./ElectricBorder";

type SectionPanelProps = {
  id: string;
  color: string;
  children: ReactNode;
  className?: string;
  maxWidth?: "4xl" | "5xl" | "6xl";
  chaos?: number;
  speed?: number;
  ambient?: boolean;
};

const maxWidthClass = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export default function SectionPanel({
  id,
  color,
  children,
  className = "",
  maxWidth = "6xl",
  chaos = 0.1,
  speed = 0.9,
  ambient = true,
}: SectionPanelProps) {
  const glowStyle = { background: color } as CSSProperties;

  return (
    <section
      id={id}
      className={`relative scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14 md:py-20 ${className}`}
    >
      {ambient ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
          <div
            className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[130px]"
            style={{ background: `${color}33` }}
          />
        </div>
      ) : null}

      <div className={`relative z-10 mx-auto w-full ${maxWidthClass[maxWidth]}`}>
        <ElectricBorder
          color={color}
          borderRadius={28}
          speed={speed}
          chaos={chaos}
          className="w-full"
          style={{ borderRadius: 28 }}
        >
          <div className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#0a0a0f]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-25 blur-3xl"
              style={glowStyle}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(255,255,255,0.07),transparent_55%)]"
              aria-hidden
            />
            <div className="relative p-6 sm:p-9 md:p-11 lg:p-12">{children}</div>
          </div>
        </ElectricBorder>
      </div>
    </section>
  );
}
