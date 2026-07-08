import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  Film,
  List,
  ChevronRight,
  X,
  Users,
  UserPlus,
  UserMinus,
  Share2,
} from "lucide-react";
import {
  getCustomLists,
  createCustomList,
  deleteCustomList,
  getCustomListItems,
  toggleCollaborative,
  getCollaborativeEditors,
  addCollaborativeEditor,
  removeCollaborativeEditor,
  getMyCollaborativeLists,
  getProfiles,
} from "../api/api";
import useAuthStore from "../store/useAuthStore";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function imgUrl(path, size = "w92") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

export default function CustomLists() {
  const currentUser = useAuthStore((s) => s.user);
  const [lists, setLists] = useState([]);
  const [collabLists, setCollabLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Create list modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Collaborative
  const [showEditors, setShowEditors] = useState(false);
  const [editors, setEditors] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [editorSearch, setEditorSearch] = useState("");

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const [own, collab] = await Promise.all([getCustomLists(), getMyCollaborativeLists()]);
      setLists(own);
      setCollabLists(collab);
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

  /* ── Collaborative helpers ── */
  const handleToggleCollab = async (list) => {
    try {
      await toggleCollaborative(list.id, !list.is_collaborative);
      await fetchLists();
      if (selectedList?.id === list.id)
        setSelectedList({ ...list, is_collaborative: !list.is_collaborative });
    } catch {}
  };

  const openEditors = async (list) => {
    setShowEditors(list.id);
    try {
      const [eds, profiles] = await Promise.all([
        getCollaborativeEditors(list.id),
        allProfiles.length ? Promise.resolve(allProfiles) : getProfiles(),
      ]);
      setEditors(eds);
      if (!allProfiles.length) setAllProfiles(profiles);
    } catch {}
  };

  const handleAddEditor = async (userId) => {
    try {
      await addCollaborativeEditor(showEditors, userId);
      const eds = await getCollaborativeEditors(showEditors);
      setEditors(eds);
      setEditorSearch("");
    } catch {}
  };

  const handleRemoveEditor = async (userId) => {
    try {
      await removeCollaborativeEditor(showEditors, userId);
      const eds = await getCollaborativeEditors(showEditors);
      setEditors(eds);
    } catch {}
  };

  const filteredProfiles = allProfiles.filter(
    (p) =>
      p.id !== currentUser?.id &&
      !editors.some((e) => e.user_id === p.id) &&
      (p.username || "").toLowerCase().includes(editorSearch.toLowerCase())
  );

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
                          {list.is_collaborative ? (
                            <Users className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Film className="w-5 h-5 text-cine-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold flex items-center gap-1.5">
                            {list.name}
                            {list.is_collaborative && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                Compartida
                              </span>
                            )}
                          </p>
                          {list.description && (
                            <p className="text-xs text-cine-muted line-clamp-1">{list.description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-cine-muted" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleCollab(list)}
                          title={list.is_collaborative ? "Desactivar colaboración" : "Hacer colaborativa"}
                          className={`p-2 transition rounded-lg ${list.is_collaborative ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-cine-muted hover:text-cine-accent"}`}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {list.is_collaborative && (
                          <button
                            onClick={() => openEditors(list)}
                            title="Gestionar editores"
                            className="p-2 text-cine-muted hover:text-cine-accent transition rounded-lg"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(list.id)}
                          className="p-2 text-cine-muted hover:text-cine-accent transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Collaborative lists shared with me */}
              {collabLists.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-base font-bold flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-emerald-400" /> Listas compartidas conmigo
                  </h2>
                  <div className="space-y-2">
                    {collabLists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center gap-3 bg-cine-card rounded-xl p-3 ring-1 ring-emerald-500/20 hover:ring-emerald-500/40 transition"
                      >
                        <button
                          onClick={() => openList(list)}
                          className="flex-1 text-left flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{list.name}</p>
                            <p className="text-xs text-cine-muted">
                              de {list.owner_username || "usuario"}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-cine-muted" />
                        </button>
                      </div>
                    ))}
                  </div>
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

      {/* Editors modal */}
      {showEditors && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-cine-card rounded-2xl w-full max-w-sm ring-1 ring-cine-border shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cine-border">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Editores
              </h3>
              <button
                onClick={() => { setShowEditors(false); setEditors([]); setEditorSearch(""); }}
                className="p-1 text-cine-muted hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Current editors */}
              {editors.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-cine-muted font-medium uppercase tracking-wider">Editores actuales</p>
                  {editors.map((e) => (
                    <div key={e.user_id} className="flex items-center justify-between bg-cine-bg rounded-lg px-3 py-2 ring-1 ring-cine-border">
                      <span className="text-sm">{e.username || e.user_id.slice(0, 8)}</span>
                      <button
                        onClick={() => handleRemoveEditor(e.user_id)}
                        className="p-1 text-cine-muted hover:text-red-400 transition"
                        title="Quitar editor"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-cine-muted text-center py-2">Sin editores aún</p>
              )}

              {/* Add editor */}
              <div className="pt-2 border-t border-cine-border">
                <p className="text-xs text-cine-muted font-medium uppercase tracking-wider mb-2">Añadir editor</p>
                <input
                  type="text"
                  placeholder="Buscar usuario…"
                  value={editorSearch}
                  onChange={(e) => setEditorSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-cine-bg rounded-lg text-sm text-white ring-1 ring-cine-border focus:ring-cine-accent outline-none mb-2"
                />
                {editorSearch.length >= 2 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredProfiles.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddEditor(p.id)}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-cine-accent/10 transition text-sm"
                      >
                        {p.avatar_url ? (
                          <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-cine-border flex items-center justify-center text-xs">
                            {(p.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span>{p.username}</span>
                        <UserPlus className="w-3.5 h-3.5 ml-auto text-emerald-400" />
                      </button>
                    ))}
                    {filteredProfiles.length === 0 && (
                      <p className="text-xs text-cine-muted text-center py-2">No se encontraron usuarios</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
