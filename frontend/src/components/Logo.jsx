export default function Logo({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <img
      src="/logo.png"
      alt="Txilms"
      className={`${sizeMap[size]} ${className} object-contain`}
    />
  );
}
