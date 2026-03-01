import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { login as apiLogin } from "../api/api";
import useAuthStore from "../store/useAuthStore";
import Logo from "../components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Rellena todos los campos");
      return;
    }
    setLoading(true);
    try {
      const data = await apiLogin(username.trim(), password);
      setAuth(data.user, data.access_token, data.refresh_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail || "Usuario o contraseña incorrectos"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="xl" />
          </div>
          <p className="text-cine-muted text-sm mt-1">Inicia sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-cine-muted mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-4 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition"
              placeholder="Tu nombre de usuario"
            />
          </div>

          <div>
            <label className="block text-xs text-cine-muted mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-cine-accent text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-cine-muted mt-6">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-cine-accent hover:underline">
            Regístrate con código de invitación
          </Link>
        </p>
        <p className="text-center text-xs text-cine-muted mt-2">
          <Link to="/recover" className="text-cine-accent/70 hover:text-cine-accent hover:underline transition">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </div>
  );
}
