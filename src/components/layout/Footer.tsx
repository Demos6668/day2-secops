import { DemoWatermark } from "@/components/Common/DemoWatermark";

interface FooterProps {
  watermark?: string;
}

export function Footer({ watermark = "DEMO DATA — NOT PRODUCTION" }: FooterProps) {
  return (
    <footer className="h-10 border-t border-white/5 surface-card px-4 sm:px-6 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
      <DemoWatermark text={watermark} />
      <span className="font-mono">Day2 SecOps {import.meta.env.VITE_APP_VERSION ?? "v0.1.0"}</span>
    </footer>
  );
}
