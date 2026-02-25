import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Send, Star, UserPlus } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    setLoading(true);
    getNotifications()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* header */}
      <section className="px-4 pt-6 md:pt-10 pb-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">
              Notificaciones
            </h1>
            <p className="text-cine-muted text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} sin leer`
                : "Todo al día"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cine-muted ring-1 ring-cine-border hover:text-cine-accent hover:ring-cine-accent transition"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
            </button>
          )}
        </div>
      </section>

      {/* list */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-cine-muted">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                onMarkRead={() => handleMarkRead(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifItem({ notif, onMarkRead }) {
  const data = notif.data || {};

  // Build message based on type
  let message = "";
  let icon = <Bell className="w-4 h-4" />;

  if (notif.type === "movie_shared") {
    message = `${data.from_username || "Alguien"} te ha enviado "${data.movie_title || "una película"}"`;
    if (data.message) message += ` — "${data.message}"`;
    icon = <Send className="w-4 h-4 text-cine-accent" />;
  } else if (notif.type === "movie_rated") {
    message = `${data.from_username || "Alguien"} ha puntuado "${data.movie_title || "una película"}" con ${data.rating}/10`;
    icon = <Star className="w-4 h-4 text-cine-gold" />;
  } else if (notif.type === "new_user") {
    message = `¡${data.username || "Un nuevo usuario"} se ha unido a Txilms!`;
    icon = <UserPlus className="w-4 h-4 text-cine-green" />;
  } else {
    message = "Nueva notificación";
  }

  const posterUrl = imgUrl(data.movie_poster);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl ring-1 transition ${
        notif.is_read
          ? "bg-cine-card/50 ring-cine-border/50 opacity-60"
          : "bg-cine-card ring-cine-border"
      }`}
    >
      {/* poster thumb */}
      {data.tmdb_id ? (
        <Link to={`/movie/${data.tmdb_id}`} className="flex-shrink-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt=""
              className="w-10 h-[60px] rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-[60px] rounded-lg bg-cine-border flex items-center justify-center text-sm">
              🎬
            </div>
          )}
        </Link>
      ) : (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cine-border flex items-center justify-center">
          {icon}
        </div>
      )}

      {/* content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2">{message}</p>
        <p className="text-[11px] text-cine-muted mt-0.5">
          {new Date(notif.created_at).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* mark read */}
      {!notif.is_read && (
        <button
          onClick={onMarkRead}
          className="p-1.5 text-cine-muted hover:text-cine-green transition rounded-lg hover:bg-white/5"
          title="Marcar como leída"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
