import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  Film,
  List,
  ChevronRight,
  X,
} from "lucide-react";
import {
  getCustomLists,
  createCustomList,
  deleteCustomList,
  getCustomListItems,
} from "../api/api";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function CustomLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Create list modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const data = await getCustomLists();
      setLists(data);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCustomList(newName.trim(), newDesc.trim() || null);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      await fetchLists();
    } catch {}
    setCreating(false);
  };

  const handleDelete = async (listId) => {
    if (!confirm("¿Eliminar esta lista?")) return;
    try {
      await deleteCustomList(listId);
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setItems([]);
      }
      await fetchLists();
    } catch {}
  };

  const openList = async (list) => {
    setSelectedList(list);
    setItemsLoading(true);
    try {
      const data = await getCustomListItems(list.id);
      setItems(data);
    } catch {
      setItems([]);
    }
    setItemsLoading(false);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <section className="px-4 pt-6 md:pt-10 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <List className="w-5 h-5 text-cine-accent" /> Mis listas
            </h1>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition"
            >
              <Plus className="w-4 h-4" /> Nueva lista
            </button>
          </div>

          {/* Selected list items view */}
          {selectedList ? (
            <div>
              <button
                onClick={() => { setSelectedList(null); setItems([]); }}
                className="text-sm text-cine-accent hover:underline flex items-center gap-1 mb-4"
              >
                ← Volver a listas
              </button>
              <h2 className="text-lg font-bold mb-1">{selectedList.name}</h2>
              {selectedList.description && (
                <p className="text-sm text-cine-muted mb-4">{selectedList.description}</p>
              )}

              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 skeleton rounded-xl" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-cine-muted text-sm py-12">
                  Esta lista está vacía. Añade películas desde la página de detalle.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <Link
                      key={item.tmdb_id}
                      to={`/movie/${item.tmdb_id}`}
                      className="flex items-center gap-3 bg-cine-card rounded-xl p-2.5 ring-1 ring-cine-border hover:ring-cine-accent/30 transition group"
                    >
                      {imgUrl(item.movie_poster) ? (
                        <img
                          src={imgUrl(item.movie_poster)}
                          alt={item.movie_title}
                          className="w-12 h-[72px] rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-[72px] rounded-lg bg-cine-border flex items-center justify-center text-cine-muted flex-shrink-0">
                          🎬
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1 group-hover:text-cine-accent transition">
                          {item.movie_title}
                        </p>
                        <p className="text-xs text-cine-muted">{item.movie_year || "—"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Lists overview */
            <>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 skeleton rounded-xl" />
                  ))}
                </div>
              ) : lists.length === 0 ? (
                <div className="text-center py-16">
                  <List className="w-12 h-12 text-cine-muted mx-auto mb-4" />
                  <p className="text-cine-muted text-sm">
                    No tienes listas personalizadas aún.
                  </p>
                  <p className="text-cine-muted text-xs mt-1">
                    Crea una para organizar tus películas a tu manera.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center gap-3 bg-cine-card rounded-xl p-3 ring-1 ring-cine-border hover:ring-cine-accent/30 transition"
                    >
                      <button
                        onClick={() => openList(list)}
                        className="flex-1 text-left flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-cine-accent/10 flex items-center justify-center">
                          <Film className="w-5 h-5 text-cine-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{list.name}</p>
                          {list.description && (
                            <p className="text-xs text-cine-muted line-clamp-1">{list.description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-cine-muted" />
                      </button>
                      <button
                        onClick={() => handleDelete(list.id)}
                        className="p-2 text-cine-muted hover:text-cine-accent transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Create list modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-cine-card rounded-2xl w-full max-w-sm ring-1 ring-cine-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cine-border">
              <h3 className="text-sm font-bold">Nueva lista</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-cine-muted hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Nombre de la lista"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-cine-bg rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
                required
                autoFocus
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-cine-bg rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-cine-accent text-white rounded-xl text-sm font-semibold hover:bg-cine-accent/90 transition disabled:opacity-50"
              >
                {creating ? "Creando…" : "Crear lista"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
