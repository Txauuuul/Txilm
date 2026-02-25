import { useState } from "react";
import { X, Star } from "lucide-react";

export default function RatingModal({ movie, onConfirm, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleConfirm = () => {
    if (rating < 1) return;
    onConfirm(rating);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-cine-card rounded-2xl w-full max-w-xs ring-1 ring-cine-border shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cine-border">
          <h3 className="text-sm font-bold">Puntuar película</h3>
          <button
            onClick={onClose}
            className="p-1 text-cine-muted hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-center">
          <p className="text-xs text-cine-muted">
            ¿Qué nota le das a{" "}
            <span className="text-white font-semibold">{movie.title}</span>?
          </p>

          {/* Star rating 1-10 */}
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-0.5 transition"
              >
                <Star
                  className={`w-6 h-6 transition ${
                    n <= (hover || rating)
                      ? "text-cine-gold fill-cine-gold"
                      : "text-cine-border"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Numeric display */}
          <p className="text-2xl font-extrabold text-cine-gold">
            {rating > 0 ? `${rating}/10` : "—"}
          </p>

          <button
            onClick={handleConfirm}
            disabled={rating < 1}
            className="w-full py-2.5 bg-cine-green text-white rounded-xl text-sm font-semibold hover:bg-cine-green/90 transition disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
