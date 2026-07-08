import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { getProfiles, shareMovie } from "../api/api";
import useAuthStore from "../store/useAuthStore";

export default function ShareModal({ movie, onClose }) {
  const currentUser = useAuthStore((s) => s.user);
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfiles()
      .then((all) => setProfiles(all.filter((p) => p.id !== currentUser?.id)))
      .catch(() => {});
  }, [currentUser]);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      await shareMovie({
        to_user_id: selected,
        tmdb_id: movie.tmdb_id,
        movie_title: movie.title,
        movie_poster: movie.poster,
        message: message.trim() || null,
      });
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-cine-card rounded-2xl w-full max-w-sm ring-1 ring-cine-border shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cine-border">
          <h3 className="text-sm font-bold">Enviar película</h3>
          <button
            onClick={onClose}
            className="p-1 text-cine-muted hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* movie info */}
          <p className="text-xs text-cine-muted">
            Enviar{" "}
            <span className="text-white font-semibold">{movie.title}</span> a:
          </p>

          {sent ? (
            <div className="text-center py-6">
              <p className="text-cine-green text-sm font-semibold">
                ¡Enviado! 🎬
              </p>
            </div>
          ) : (
            <>
              {/* friend list */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {profiles.length === 0 ? (
                  <p className="text-xs text-cine-muted text-center py-4">
                    No hay otros usuarios todavía
                  </p>
                ) : (
                  profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                        selected === p.id
                          ? "bg-cine-accent/10 text-cine-accent ring-1 ring-cine-accent"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-cine-border flex items-center justify-center text-xs font-bold uppercase">
                        {p.username?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium">{p.username}</span>
                    </button>
                  ))
                )}
              </div>

              {/* optional message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Mensaje opcional…"
                rows={2}
                className="w-full px-3 py-2 bg-cine-bg rounded-xl text-xs text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition resize-none"
              />

              {error && (
                <p className="text-cine-accent text-xs text-center">
                  {error}
                </p>
              )}

              <button
                onClick={handleSend}
                disabled={!selected || sending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
