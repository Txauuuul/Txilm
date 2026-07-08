import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { getNotificationCount } from "../api/api";
import useAuthStore from "../store/useAuthStore";

const POLL_MS = 30_000; // 30 seconds

export default function NotificationBell({ className = "" }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [count, setCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchCount = async () => {
    try {
      const c = await getNotificationCount();
      setCount(c);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_MS);

    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Link
      to="/notifications"
      className={`relative inline-flex items-center justify-center ${className}`}
      title="Notificaciones"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-cine-accent text-white rounded-full px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
