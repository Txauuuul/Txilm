export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  return (
    <img
      src="/Txilmslogo.png"
      alt="Txilms"
      className={`${sizeMap[size]} object-contain drop-shadow-[0_0_8px_rgba(229,9,20,0.4)] ${className}`}
    />
  );
}
