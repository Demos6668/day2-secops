interface FooterProps {
  watermark?: string;
}

export function Footer({ watermark }: FooterProps) {
  return (
    <footer className="h-10 border-t border-white/5 surface-card px-4 sm:px-6 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
      <span className="font-mono text-muted-foreground/80">
        {watermark ?? ""}
      </span>
      <span className="font-mono">Day2 SecOps {import.meta.env.VITE_APP_VERSION ?? "v0.1.0"}</span>
    </footer>
  );
}
