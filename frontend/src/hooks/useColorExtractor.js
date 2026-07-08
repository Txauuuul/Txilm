import { useEffect, useState } from "react";

/**
 * Extracts the dominant colour from an image URL using a canvas.
 * Returns an rgba string suitable for CSS backgrounds / gradients.
 */
export default function useColorExtractor(imageUrl) {
  const [color, setColor] = useState("rgba(14,14,31,1)");

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setColor(`rgba(${r},${g},${b},0.6)`);
      } catch {
        // CORS or tainted canvas – keep default
      }
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return color;
}
