import Logo from "../components/Logo";

export default function LogoShowcase() {
  return (
    <div className="min-h-screen bg-cine-bg text-white pb-20">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-extrabold mb-2">
          <span className="text-cine-accent">Txilms</span> Logo
        </h1>
        <p className="text-cine-muted mb-10">Logo oficial de la aplicación</p>

        <div className="bg-cine-card rounded-xl p-12 ring-1 ring-cine-border flex flex-col items-center text-center">
          <div className="mb-8 p-8 bg-cine-bg rounded-lg">
            <Logo size="lg" className="text-cine-accent mx-auto" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Película + Claqueta</h2>
          <p className="text-cine-muted mb-6 max-w-sm">
            Diseño profesional que combina la cinta de película enrollada con la claqueta de cine, 
            simbolizando la conexión entre el contenido cinematográfico y las puntuaciones de Txilms.
          </p>
          
          <div className="space-y-4 w-full">
            <div>
              <h3 className="font-semibold text-sm mb-2">Versiones disponibles:</h3>
              <div className="flex justify-around items-center bg-cine-bg p-4 rounded-lg">
                <div className="text-center">
                  <Logo size="sm" className="text-cine-accent mx-auto mb-2" />
                  <p className="text-xs text-cine-muted">Pequeño</p>
                </div>
                <div className="text-center">
                  <Logo size="md" className="text-cine-accent mx-auto mb-2" />
                  <p className="text-xs text-cine-muted">Medio</p>
                </div>
                <div className="text-center">
                  <Logo size="lg" className="text-cine-accent mx-auto mb-2" />
                  <p className="text-xs text-cine-muted">Grande</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="mt-8 px-6 py-2 bg-cine-accent text-white rounded-lg font-medium hover:bg-cine-accent/80 transition"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
