interface DemoWatermarkProps {
  text?: string;
  className?: string;
}

/**
 * Kept as a no-op component for binary-compat with existing imports.
 * The platform no longer surfaces a demo-environment notice on every page.
 */
export function DemoWatermark(_props: DemoWatermarkProps) {
  return null;
}
