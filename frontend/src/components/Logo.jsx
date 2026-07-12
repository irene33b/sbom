const SIZE_MAP = {
  xs: "w-7 h-7",
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-40 h-40",
};

export default function Logo({ size = "sm", glow = false, className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${SIZE_MAP[size]} ${className}`}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(217,42,143,0.35) 0%, rgba(45,212,220,0.3) 55%, transparent 75%)",
          }}
        />
      )}
      <img
        src="/logo-mark.svg"
        alt="SentryChain"
        className="relative w-full h-full object-contain drop-shadow-[0_0_12px_rgba(45,212,220,0.25)]"
      />
    </div>
  );
}
