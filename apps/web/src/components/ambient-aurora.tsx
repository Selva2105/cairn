export function AmbientAurora() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Top right warm clay glow */}
      <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-[120px] dark:from-primary/15 dark:via-primary/8 dark:to-transparent animate-float-slow motion-reduce:animate-none" />

      {/* Bottom left moss glow */}
      <div className="absolute -bottom-36 -left-36 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-success/15 via-success/8 to-transparent blur-[130px] dark:from-success/12 dark:via-success/6 dark:to-transparent animate-float-reverse motion-reduce:animate-none" />

      {/* Subtle center warm accent blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[420px] w-[600px] rounded-full bg-gradient-to-b from-amber-400/10 via-amber-500/5 to-transparent blur-[140px] dark:from-amber-400/6 dark:via-amber-500/3 dark:to-transparent opacity-70" />

      {/* Subtle radial fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,hsl(var(--background)/0.3)_100%)]" />
    </div>
  );
}
