# 🎬 Txilms - Agregador de Críticas de Cine

Aplicación móvil gratuita que agrega puntuaciones de **IMDb**, **Rotten Tomatoes** y **FilmAffinity** en una sola vista, junto con información de **plataformas de streaming** por país.

**Stack:** FastAPI (Python) en **Vercel** + **Supabase** (PostgreSQL) + React Native (Expo)

---

## 📁 Estructura del Proyecto

```
Txilms/
├── backend/                        # API FastAPI → se despliega en Vercel
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Variables de entorno (TMDB + Supabase)
│   │   ├── cache.py               # Caché en Supabase (PostgreSQL, TTL 7 días)
│   │   ├── tmdb_service.py        # Integración con API de TMDB
│   │   ├── scraper_rt.py          # Scraping de Rotten Tomatoes
│   │   └── scraper_fa.py          # Scraping de FilmAffinity
│   ├── main.py                    # Aplicación FastAPI principal
│   ├── vercel.json                # Configuración de despliegue Vercel
│   ├── supabase_migration.sql     # SQL para crear tabla en Supabase
│   ├── requirements.txt           # Dependencias Python
│   └── .env.example               # Plantilla de variables de entorno
│
├── frontend/                       # App React Native (Expo)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.js      # Búsqueda + tendencias
│   │   │   ├── DetailsScreen.js   # Detalle + puntuaciones + streaming
│   │   │   └── ListsScreen.js     # Favoritos / Pendientes / Vistas
│   │   ├── services/
│   │   │   └── api.js             # Cliente HTTP (apunta a Vercel)
│   │   ├── store/
│   │   │   └── useStore.js        # Zustand + AsyncStorage
│   │   └── theme/
│   │       └── theme.js           # Colores, tamaños, sombras
│   ├── assets/
│   ├── App.js                     # Entry point + navegación
│   ├── app.json                   # Configuración de Expo
│   ├── babel.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Despliegue en Producción

### PASO 1: Crear la base de datos en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. Crea un nuevo proyecto (elige la región más cercana, ej: **eu-west-1** para Europa).
3. Espera a que se provisione (~1 minuto).
4. Ve a **SQL Editor** (menú lateral izquierdo).
5. Haz clic en **New Query**.
6. Copia y pega el contenido completo de `backend/supabase_migration.sql`.
7. Haz clic en **Run** (▶).
8. Deberías ver "Success. No rows returned" → la tabla está creada.
9. Ve a **Settings > API** y apunta estos dos valores:
   - **Project URL** → será tu `SUPABASE_URL`
   - **service_role key** (bajo Project API keys) → será tu `SUPABASE_KEY`

> ⚠️ Usa la **service_role key**, NO la anon key. El backend necesita permisos completos.

### PASO 2: Obtener la API Key de TMDB

1. Ve a [themoviedb.org](https://www.themoviedb.org/) y crea una cuenta (gratis).
2. Ve a **Settings > API** ([enlace directo](https://www.themoviedb.org/settings/api)).
3. Solicita una API Key (tipo: Developer → uso personal).
4. En el formulario, pon:
   - **Tipo de uso:** Personal
   - **URL de la aplicación:** `https://txilms-api.vercel.app` (o la URL que te asigne Vercel)
   - **Descripción:** "Aplicación de agregación de críticas de cine"
5. Copia tu **API Key (v3 auth)**.

### PASO 3: Desplegar el Backend en Vercel

1. Instala Vercel CLI (si no la tienes):
   ```bash
   npm install -g vercel
   ```

2. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```

3. Despliega:
   ```bash
   vercel
   ```
   - ¿Link to existing project? → **N** (crear nuevo)
   - ¿Project name? → `txilms-api`
   - ¿In which directory is your code located? → `./` (enter)
   - Vercel detectará las configuraciones de `vercel.json` automáticamente.

4. Configura las variables de entorno en Vercel:
   ```bash
   vercel env add TMDB_API_KEY
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_KEY
   ```
   (pega cada valor cuando te lo pida, selecciona "Production + Preview + Development")

5. Redesplega para que tome las variables:
   ```bash
   vercel --prod
   ```

6. Tu API estará en algo como: `https://txilms-api.vercel.app`
7. Verifica con: `https://txilms-api.vercel.app/health`

### PASO 4: Configurar el Frontend

1. Abre `frontend/src/services/api.js`.
2. Cambia la URL al dominio que te dio Vercel:
   ```js
   const API_BASE_URL = "https://txilms-api.vercel.app";
   ```
3. Instala dependencias y ejecuta:
   ```bash
   cd frontend
   npm install
   npx expo start
   ```

### PASO 5 (Opcional): Actualizar la URL en TMDB

Una vez que Vercel te asigne la URL definitiva, vuelve a TMDB Settings > API y actualiza la URL de la aplicación si es diferente a la que pusiste inicialmente.

---

## 🛠️ Desarrollo Local

Si quieres probar en local antes de desplegar:

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate           # Windows
pip install -r requirements.txt
copy .env.example .env          # Rellena TMDB_API_KEY + SUPABASE_URL + SUPABASE_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (otra terminal)
cd frontend
npm install
# En src/services/api.js, descomenta la línea de dev local:
# const API_BASE_URL = "http://192.168.1.100:8000";
npx expo start
```

---

## 🔑 Variables de Entorno Necesarias

| Variable | Obligatoria | Dónde obtenerla |
|----------|-------------|-----------------|
| `TMDB_API_KEY` | ✅ Sí | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `SUPABASE_URL` | ✅ Sí | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_KEY` | ✅ Sí | Supabase Dashboard > Settings > API > service_role key |
| `OMDB_API_KEY` | ❌ Opcional | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) |

---

## 📡 Endpoints del Backend

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/search?query=texto&region=ES` | Buscar películas |
| GET | `/movie/{tmdb_id}?region=ES` | Detalle completo + puntuaciones |
| GET | `/trending?time_window=week` | Películas en tendencia |
| GET | `/health` | Health check |
| GET | `/docs` | Documentación Swagger |

---

## 🎨 Características

- **Dark Mode** cinematográfico por defecto
- **3 puntuaciones** agregadas: IMDb ⭐ + Rotten Tomatoes 🍅 + FilmAffinity 🎬
- **Streaming por país**: Saber dónde ver cada película según tu ubicación
- **Listas personales**: Favoritos ❤️ + Pendientes 📑 + Vistas 👁️
- **Caché inteligente** en Supabase: scraping solo cada 7 días por película
- **Búsqueda con autocompletado** y debounce
- **Carrusel de tendencias** semanales
- **Degradado dinámico** basado en el color del póster
- **Serverless** en Vercel: escala automáticamente, sin servidor que mantener

---

## ⚙️ Stack Tecnológico

### Backend (Vercel Serverless)
- **FastAPI** - Framework web asíncrono
- **httpx** - Cliente HTTP async
- **BeautifulSoup4** - Scraping HTML
- **Supabase** - Base de datos PostgreSQL (caché de puntuaciones)
- **Pydantic** - Validación de datos

### Frontend (Expo)
- **React Native** + **Expo** (SDK 52)
- **React Navigation** - Bottom Tabs + Native Stack + Material Top Tabs
- **Zustand** - Gestión de estado
- **AsyncStorage** - Persistencia local
- **expo-linear-gradient** - Degradados

---

## 📝 Notas

1. **Scraping**: Depende de la estructura HTML actual de RT y FA. Si cambian, actualiza los selectores en `scraper_rt.py` y `scraper_fa.py`.
2. **Vercel Free Tier**: 100GB bandwidth/mes, funciones serverless con 10s timeout. Más que suficiente.
3. **Supabase Free Tier**: 500MB de base de datos, 50K filas. La caché usará muy poco.
4. **Assets**: Reemplaza los iconos placeholder con tu diseño personalizado.

---

## 📄 Licencia

Proyecto personal / educativo. Las puntuaciones pertenecen a sus respectivas plataformas.
Datos de películas provistos por [TMDB](https://www.themoviedb.org/).
