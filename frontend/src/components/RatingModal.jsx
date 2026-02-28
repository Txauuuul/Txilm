import { useState } from "react";
import { X, Star } from "lucide-react";

export default function RatingModal({ movie, onConfirm, onClose, initialRating = 0, initialReview = "" }) {
  const [rating, setRating] = useState(initialRating || 0);
  const [review, setReview] = useState(initialReview || "");

  const handleConfirm = () => {
    if (rating < 0.5) return;
    onConfirm(rating, review.trim() || null);
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

          {/* Star visual display */}
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const filled = rating >= n;
              const halfFilled = !filled && rating >= n - 0.5;
              return (
                <button
                  key={n}
                  onClick={() => setRating(rating === n ? n - 0.5 : n)}
                  className="p-0.5 transition"
                  title={`${n}`}
                >
                  <Star
                    className={`w-6 h-6 transition ${
                      filled
                        ? "text-cine-gold fill-cine-gold"
                        : halfFilled
                        ? "text-cine-gold fill-cine-gold/50"
                        : "text-cine-border"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Decimal slider */}
          <div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full accent-cine-gold"
            />
          </div>

          {/* Numeric display */}
          <p className="text-2xl font-extrabold text-cine-gold">
            {rating > 0 ? `${rating.toFixed(1)}/10` : "—"}
          </p>

          {/* Mini-review */}
          <div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value.slice(0, 280))}
              placeholder="Mini-reseña (opcional, máx. 280 chars)"
              className="w-full bg-cine-bg rounded-lg px-3 py-2 text-xs text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none resize-none h-16 placeholder:text-cine-muted/60"
            />
            <p className="text-[10px] text-cine-muted text-right mt-0.5">{review.length}/280</p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={rating < 0.5}
            className="w-full py-2.5 bg-cine-green text-white rounded-xl text-sm font-semibold hover:bg-cine-green/90 transition disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
