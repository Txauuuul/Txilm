export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: { box: "w-7 h-7", img: "w-[70%]", rounded: "rounded-lg" },
    md: { box: "w-10 h-10", img: "w-[70%]", rounded: "rounded-xl" },
    lg: { box: "w-16 h-16", img: "w-[70%]", rounded: "rounded-2xl" },
    xl: { box: "w-24 h-24", img: "w-[70%]", rounded: "rounded-3xl" },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`${s.box} ${s.rounded} bg-black flex items-center justify-center shrink-0 shadow-lg shadow-black/40 ${className}`}
    >
      <img
        src="/Txilmslogo.png"
        alt="Txilms"
        className={`${s.img} object-contain drop-shadow-[0_0_6px_rgba(229,9,20,0.5)]`}
      />
    </div>
  );
}
