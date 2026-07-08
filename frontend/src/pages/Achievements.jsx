import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Lock } from "lucide-react";
import { getMyAchievements, getUserAchievements } from "../api/api";
import useAuthStore from "../store/useAuthStore";

export default function Achievements() {
  const { userId } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const isMe = !userId || userId === currentUser?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = isMe ? getMyAchievements() : getUserAchievements(userId);
    fn.then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, isMe]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 md:pt-20 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={isMe ? "/profile" : `/profile/${userId}`} className="p-2 rounded-xl bg-cine-card border border-cine-border hover:bg-white/5">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-cine-gold" size={24} />
            Logros
          </h1>
          <p className="text-sm text-cine-muted">
            {data ? `${data.unlocked_count}/${data.total} desbloqueados` : "Cargando..."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-cine-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-center text-cine-muted py-10">Error al cargar logros</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-8 bg-cine-card border border-cine-border rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-cine-muted">Progreso total</span>
              <span className="text-cine-gold font-bold">{Math.round((data.unlocked_count / data.total) * 100)}%</span>
            </div>
            <div className="h-3 bg-cine-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cine-accent to-cine-gold rounded-full transition-all duration-700"
                style={{ width: `${(data.unlocked_count / data.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Unlocked */}
          {data.unlocked.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                🏆 Desbloqueados ({data.unlocked.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.unlocked.map((a) => (
                  <div
                    key={a.id}
                    className="bg-cine-card border border-cine-accent/30 rounded-2xl p-4 flex items-center gap-4 hover:border-cine-accent/60 transition"
                  >
                    <span className="text-3xl">{a.emoji}</span>
                    <div>
                      <p className="font-semibold text-white">{a.name}</p>
                      <p className="text-xs text-cine-muted">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {data.locked.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Lock size={18} className="text-cine-muted" /> Bloqueados ({data.locked.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.locked.map((a) => (
                  <div
                    key={a.id}
                    className="bg-cine-card border border-cine-border rounded-2xl p-4 flex items-center gap-4 opacity-50"
                  >
                    <span className="text-3xl grayscale">{a.emoji}</span>
                    <div>
                      <p className="font-semibold text-cine-muted">{a.name}</p>
                      <p className="text-xs text-cine-muted/70">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
