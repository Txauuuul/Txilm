import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { resetPassword } from "../api/api";
import Logo from "../components/Logo";

export default function RecoverPassword() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !code.trim() || !newPassword || !confirmPassword) {
      setError("Rellena todos los campos");
      return;
    }
    if (newPassword.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(username.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Código inválido, expirado o ya usado"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-cine-green/20 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-cine-green" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            ¡Contraseña restablecida!
          </h2>
          <p className="text-sm text-cine-muted mb-6">
            Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar
            sesión con tu nueva contraseña.
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full py-2.5 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition"
          >
            Ir a Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="xl" />
          </div>
          <p className="text-cine-muted text-sm mt-1">
            Recuperar contraseña
          </p>
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
              Código de recuperación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full px-4 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition font-mono tracking-widest"
              placeholder="A3F2B1C9"
              maxLength={8}
            />
            <p className="text-[10px] text-cine-muted mt-1">
              Pide este código a un administrador
            </p>
          </div>

          <div>
            <label className="block text-xs text-cine-muted mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 bg-cine-card rounded-xl text-sm text-white placeholder-cine-muted ring-1 ring-cine-border focus:ring-cine-accent focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs text-cine-muted mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
            <KeyRound className="w-4 h-4" />
            {loading ? "Restableciendo…" : "Restablecer contraseña"}
          </button>
        </form>

        <p className="text-center text-xs text-cine-muted mt-6">
          <Link
            to="/login"
            className="text-cine-accent hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
