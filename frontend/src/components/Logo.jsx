export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <img
      src="/Txilmslogo.png"
      alt="Txilms"
      className={`${sizeMap[size]} object-contain ${className}`}
    />
  );
}
