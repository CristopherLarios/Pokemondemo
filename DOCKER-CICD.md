# 🐳 Docker + CI/CD con GitHub Actions + Render

> Clase práctica demostrativa y plantilla reutilizable.
> Proyecto: **Pokemondemo** (sitio estático HTML/CSS/JS servido con nginx).

```text
 Código ──push──▶ GitHub Actions ──▶ build ──▶ test ──▶ push a GHCR ──▶ Render deploy hook
 (tu PC)          (CI)                                   (registro)       (CD)
```

**Índice**

- [Parte 0 · Requisitos](#parte-0--requisitos)
- [Parte 1 · Dockerizar la app](#parte-1--dockerizar-la-app)
- [Parte 2 · Comandos básicos de Docker](#parte-2--comandos-básicos-de-docker)
- [Parte 3 · CI con GitHub Actions](#parte-3--ci-con-github-actions)
- [Parte 4 · Guardar la imagen en GitHub (GHCR)](#parte-4--guardar-la-imagen-en-github-ghcr)
- [Parte 5 · CD: desplegar en Render](#parte-5--cd-desplegar-en-render)
- [Parte 6 · Usar esto como plantilla](#parte-6--usar-esto-como-plantilla)
- [Parte 7 · Configuración manual del entorno (trace)](#parte-7--configuración-manual-del-entorno-trace)
- [Problemas frecuentes](#problemas-frecuentes)
- [Anexo · Railway (CD desactivado)](#anexo--railway-cd-desactivado)

---

## Parte 0 · Requisitos

| Herramienta | Para qué | Verificar |
|---|---|---|
| Docker Desktop | Construir y correr imágenes | `docker --version` |
| Git | Control de versiones | `git --version` |
| Cuenta GitHub | Repo + Actions + registro de imágenes | — |
| Cuenta Render | Hosting del contenedor | https://render.com |

Crear la rama de trabajo:

```bash
git checkout -b DOCKERCICD
```

---

## Parte 1 · Dockerizar la app

### 1.1 Conceptos clave

| Concepto | Analogía | Qué es |
|---|---|---|
| **Dockerfile** | Receta | Instrucciones para construir una imagen |
| **Imagen** | Pastel congelado | Paquete inmutable: SO mínimo + servidor + tu código |
| **Contenedor** | Porción servida | Una imagen *en ejecución* |
| **Registro** | Supermercado | Lugar donde se guardan imágenes (Docker Hub, GHCR) |
| **Tag** | Etiqueta de fecha | Versión de una imagen: `latest`, `v1.0`, `sha-3896c7d` |

Nuestra app es estática (HTML, CSS, JS), así que solo necesitamos un servidor web: **nginx**.

### 1.2 Archivos creados

```text
Pokemondemo/
├── Dockerfile                      # receta de la imagen
├── .dockerignore                   # qué NO copiar a la imagen
├── docker/
│   └── default.conf.template       # configuración de nginx
└── .github/workflows/ci-cd.yml     # pipeline CI/CD
```

### 1.3 `Dockerfile` explicado línea por línea

```dockerfile
FROM nginx:1.27-alpine
```
Imagen base. `nginx` = servidor web, `1.27` = versión fija (reproducible), `alpine` = Linux mínimo (~20 MB).
> ⚠️ Evita `FROM nginx:latest` en producción: "latest" cambia sin avisar.

```dockerfile
ENV PORT=80
```
Variable de entorno con valor por defecto. Render (o Railway) asigna su propio puerto en `PORT`; en local usamos 80.

```dockerfile
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
```
La imagen oficial de nginx procesa todo lo que esté en `/etc/nginx/templates/` al arrancar: reemplaza `${PORT}` por su valor real y genera la config final.

```dockerfile
COPY index.html github.html test.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
```
Copiamos el sitio a la carpeta que nginx sirve. Cada `COPY` crea una **capa**; si un archivo no cambia, Docker reutiliza la capa de la caché (builds más rápidos).

```dockerfile
EXPOSE 80
```
Documentación: indica en qué puerto escucha el contenedor. No publica nada por sí solo (eso lo hace `-p`).

### 1.4 `docker/default.conf.template`

```nginx
server {
    listen ${PORT};                          # puerto dinámico (80 local, el que diga Render en la nube)
    root /usr/share/nginx/html;              # carpeta del sitio
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;    # si no existe la ruta, devuelve index.html
    }
}
```

### 1.5 `.dockerignore`

```text
.git
.github
*.md
```
Igual que `.gitignore` pero para el `docker build`: imagen más pequeña y sin archivos innecesarios.

### 1.6 Construir y correr ✅

```bash
# Construir la imagen (el "." es el contexto: carpeta actual)
docker build -t pokemondemo:1.0 .

# Correrla: puerto 8080 de mi PC -> puerto 80 del contenedor
docker run -d --name pokemon -p 8080:80 pokemondemo:1.0
```

Abrir 👉 http://localhost:8080

Simular la nube (puerto dinámico, como Render/Railway):

```bash
docker run -d --name pokemon-railway -e PORT=9000 -p 9000:9000 pokemondemo:1.0
# http://localhost:9000
```

---

## Parte 2 · Comandos básicos de Docker

### 2.1 Imágenes

| Comando | Qué hace |
|---|---|
| `docker build -t nombre:tag .` | Construye una imagen desde el Dockerfile |
| `docker images` | Lista imágenes locales |
| `docker pull nginx:1.27-alpine` | Descarga una imagen de un registro |
| `docker history pokemondemo:1.0` | Muestra las capas de la imagen |
| `docker inspect pokemondemo:1.0` | Metadatos completos (JSON) |
| `docker rmi pokemondemo:1.0` | Borra una imagen |
| `docker image prune` | Borra imágenes "huérfanas" (`<none>`) |
| `docker image prune -a` | Borra **todas** las imágenes sin contenedor que las use |

### 2.2 Contenedores

| Comando | Qué hace |
|---|---|
| `docker run -d -p 8080:80 --name app imagen` | Crea y arranca un contenedor (`-d` = segundo plano) |
| `docker ps` | Contenedores corriendo |
| `docker ps -a` | Todos (incluye detenidos) |
| `docker logs -f app` | Ver logs en vivo |
| `docker exec -it app sh` | Abrir una terminal dentro del contenedor |
| `docker stop app` / `docker start app` | Detener / arrancar |
| `docker rm app` | Borrar (debe estar detenido) |
| `docker rm -f app` | Detener y borrar de una vez |
| `docker system prune` | Limpieza general (contenedores parados, redes, caché) |

### 2.3 Versiones (tags) de imágenes

Una imagen puede tener **varios tags** apuntando al mismo contenido:

```bash
# Versión 1.0
docker build -t pokemondemo:1.0 .

# Hago un cambio en index.html y construyo la 1.1
docker build -t pokemondemo:1.1 .

# Marco la 1.1 como "latest" (no copia nada, solo agrega una etiqueta)
docker tag pokemondemo:1.1 pokemondemo:latest

docker images pokemondemo
# REPOSITORY    TAG      IMAGE ID       ...
# pokemondemo   1.1      a1b2c3d4e5f6
# pokemondemo   latest   a1b2c3d4e5f6   <- mismo ID que 1.1
# pokemondemo   1.0      f6e5d4c3b2a1

# Rollback: volver a correr la 1.0
docker rm -f pokemon
docker run -d --name pokemon -p 8080:80 pokemondemo:1.0

# Borrar una versión vieja
docker rmi pokemondemo:1.0
```

**Convenciones de tags**

| Tag | Uso |
|---|---|
| `latest` | La más reciente (cómoda, pero ambigua) |
| `1.0`, `1.1` (SemVer) | Releases humanas |
| `sha-3896c7d` | Commit exacto de Git → trazabilidad total (la usa nuestro pipeline) |

### 2.4 Ejercicio de clase 🧪

1. Construye `pokemondemo:1.0` y córrela en el 8080.
2. Cambia el `<h1>` de `index.html`, construye `pokemondemo:1.1` y córrela en el 8081.
3. Compara ambas en el navegador (dos versiones vivas a la vez).
4. Borra todo: `docker rm -f $(docker ps -aq --filter name=pokemon)` y `docker rmi pokemondemo:1.0 pokemondemo:1.1`.

---

## Parte 3 · CI con GitHub Actions

### 3.1 ¿Qué es?

**GitHub Actions** ejecuta tareas automáticamente en servidores de GitHub cuando pasa algo en el repo (un push, un PR...). Se define en archivos YAML dentro de `.github/workflows/`.

| Término | Significado |
|---|---|
| **Workflow** | El archivo `.yml` completo |
| **Event / `on`** | Qué lo dispara (push, PR, manual) |
| **Job** | Grupo de pasos que corre en una máquina virtual |
| **Step** | Un paso: un comando (`run`) o una acción reutilizable (`uses`) |
| **Runner** | La máquina virtual (`ubuntu-latest`) |
| **Secret** | Valor privado (tokens) guardado en GitHub |

### 3.2 El archivo `.github/workflows/ci-cd.yml` explicado

#### Cabecera: nombre y disparadores

```yaml
name: CI/CD Docker -> GHCR -> Render

on:
  push:
    branches: [main, DOCKERCICD]   # cada push a estas ramas
  pull_request:
    branches: [main]               # cada PR hacia main (solo build + test, sin publicar)
  workflow_dispatch:               # botón "Run workflow" manual en la pestaña Actions
```

#### Variables globales

```yaml
env:
  REGISTRY: ghcr.io                     # registro de GitHub
  IMAGE_NAME: ${{ github.repository }}  # "usuario/repo" → ghcr.io/usuario/repo
```
`${{ ... }}` es una **expresión**: GitHub la reemplaza al ejecutar. `github.repository` es un valor de **contexto** que GitHub ya conoce.

#### Job 1: `build-test-push`

```yaml
jobs:
  build-test-push:
    runs-on: ubuntu-latest      # VM Linux nueva y limpia (trae Docker instalado)
    permissions:
      contents: read            # leer el código
      packages: write           # escribir imágenes en GHCR
```

**Step 1 – Descargar el código.** El runner arranca vacío; esta acción clona el repo.
```yaml
      - name: 1. Descargar el código
        uses: actions/checkout@v4
```

**Step 2 – Construir la imagen.** Igual que en tu PC.
```yaml
      - name: 2. Construir la imagen
        run: docker build -t pokemondemo:test .
```

**Step 3 – Prueba sencilla (smoke test).** Levantamos el contenedor y verificamos que responde con la página correcta. Si `curl` falla o `grep` no encuentra el texto, el comando sale con error → **el pipeline se detiene y no se publica nada roto**.
```yaml
      - name: 3. Prueba sencilla (levantar y hacer curl)
        run: |
          docker run -d --name app -p 8080:80 pokemondemo:test
          sleep 3
          curl -sf http://localhost:8080 | grep -q "PokéAPI"
          echo "✅ La app responde y contiene 'PokéAPI'"
```
- `curl -s` silencioso, `-f` falla si el HTTP es 4xx/5xx.
- `grep -q` busca sin imprimir; devuelve error si no encuentra.

**Step 4 – Logs si algo falló.** `if: failure()` solo corre cuando un paso anterior falló: muy útil para depurar.
```yaml
      - name: 4. Logs del contenedor (solo si falló)
        if: failure()
        run: docker logs app
```

> La Parte 4 explica los steps 5–7 (publicar la imagen).

#### Job 2: `deploy-render` → ver Parte 5. (El job `deploy-railway` quedó comentado: ver Anexo.)

### 3.3 Ver el pipeline en acción

```bash
git add .
git commit -m "feat: docker + ci/cd"
git push -u origin DOCKERCICD
```

En GitHub → pestaña **Actions** → clic en la ejecución → clic en el job → expande cada step para ver su salida. ✅ verde = pasó, ❌ rojo = falló.

**Demo para clase:** cambia `"PokéAPI"` por `"Digimon"` en el step 3, haz push y muestra cómo el pipeline falla en la prueba y **no** publica la imagen. Luego reviértelo.

---

## Parte 4 · Guardar la imagen en GitHub (GHCR)

**GHCR** (GitHub Container Registry, `ghcr.io`) es el "Docker Hub" de GitHub. Las imágenes aparecen en la sección **Packages** del repo/perfil.

### 4.1 Steps del workflow

**Step 5 – Login.** `GITHUB_TOKEN` lo crea GitHub automáticamente en cada ejecución: **no hay que configurar nada**. Gracias a `packages: write` puede subir imágenes.
```yaml
      - name: 5. Login en GitHub Container Registry
        if: github.event_name != 'pull_request'   # en PRs no publicamos
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
```

**Step 6 – Calcular tags.** Genera dos etiquetas: `latest` y `sha-<commit>` (además convierte el nombre a minúsculas, requisito de GHCR).
```yaml
      - name: 6. Calcular tags (latest + sha)
        id: meta                     # id para leer sus salidas después
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha
```

**Step 7 – Construir y subir.**
```yaml
      - name: 7. Publicar la imagen en GHCR
        if: github.event_name != 'pull_request'
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}       # salidas del step 6
          labels: ${{ steps.meta.outputs.labels }}
```

### 4.2 Después del primer push

1. Ve a tu perfil de GitHub → **Packages** → `pokemondemo`.
2. Verás los tags `latest` y `sha-xxxxxxx`.
3. **Hazla pública** (necesario para que Render la descargue sin credenciales):
   **Package settings → Danger Zone → Change visibility → Public**.

### 4.3 Usar la imagen publicada desde cualquier PC

```bash
docker pull ghcr.io/cristopherlarios/pokemondemo:latest
docker run -d -p 8080:80 ghcr.io/cristopherlarios/pokemondemo:latest

# Una versión exacta (rollback)
docker pull ghcr.io/cristopherlarios/pokemondemo:sha-3896c7d
```

> El nombre en GHCR siempre va en **minúsculas**.

---

## Parte 5 · CD: desplegar en Render

**CI** = integración continua (construir + probar). **CD** = despliegue continuo (llevar a producción automáticamente).

Render no necesita CLI: cada servicio tiene un **Deploy Hook**, una URL secreta que al recibir un `POST` vuelve a desplegar el servicio (descarga otra vez `:latest` desde GHCR).

### 5.1 Crear el servicio en Render (una sola vez, manual)

1. https://dashboard.render.com → **+ New** → **Web Service**.
2. Elige **Existing Image** (desplegar una imagen ya construida).
3. **Image URL**: `ghcr.io/cristopherlarios/pokemondemo:latest` → **Connect**.
   > Si dice que no puede acceder, el paquete en GHCR sigue privado (Parte 4.2).
4. Configura:
   - **Name**: `pokemondemo` (será parte de la URL).
   - **Region**: la más cercana (ej. *Oregon* u *Ohio*).
   - **Instance Type**: **Free**.
5. **Advanced** (opcional): **Environment Variables** → `PORT` = `10000`. Render ya inyecta `PORT=10000` por defecto y nuestra imagen lo respeta, así que normalmente no hace falta.
6. **Deploy Web Service** y espera a que el log diga *Your service is live 🎉*.
7. Abre la URL `https://pokemondemo-xxxx.onrender.com` 🎉

> ℹ️ Plan Free: el servicio "se duerme" tras ~15 min sin visitas; la primera visita después tarda ~30–50 s en despertar. Es normal.

### 5.2 Conectar GitHub Actions con Render

Solo hace falta **un secret** en GitHub:

| Secret | Dónde se obtiene |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render → servicio → **Settings** → sección **Deploy Hook** → copiar la URL (`https://api.render.com/deploy/srv-...?key=...`) |

Guardarlo: GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**.

> 🔐 La URL del hook **es** la contraseña: quien la tenga puede redesplegar tu servicio. Nunca la pongas en el `.yml`. Si se filtra, en Render usa **Regenerate** y actualiza el secret.

### 5.3 El job de CD explicado

```yaml
  deploy-render:
    needs: build-test-push                     # solo corre si el job 1 terminó OK
    if: github.event_name != 'pull_request'    # los PR no despliegan
    runs-on: ubuntu-latest
    steps:
      - name: Redesplegar el servicio (Render descarga la nueva imagen :latest)
        run: curl -sf -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

- `needs` crea la cadena **build → test → push → deploy**. Si falla la prueba, nunca llega a producción.
- `curl -X POST <hook>` le dice a Render "despliega de nuevo"; Render vuelve a descargar `:latest` de GHCR.
- `-f` hace que el step falle (❌) si Render responde con error (hook mal copiado, servicio borrado...).
- No necesita `container:` ni CLI: `curl` ya viene en `ubuntu-latest`.

### 5.4 Flujo completo

```text
git push
  └─▶ Job build-test-push
        1 checkout ─▶ 2 build ─▶ 3 test ─▶ 5 login ─▶ 6 tags ─▶ 7 push a ghcr.io
  └─▶ Job deploy-render (needs)
        curl POST deploy hook ─▶ Render descarga :latest ─▶ nueva versión en línea
```

### 5.5 Rollback en Render

Opción A (rápida): Render → servicio → **Events** → deploy anterior → **Rollback**.
Opción B (por versión): **Settings → Image URL** → cambia a `ghcr.io/cristopherlarios/pokemondemo:sha-<commit-bueno>` → **Save** y despliega.
> Ojo: con la opción B el siguiente push seguirá desplegando esa imagen fija; vuelve a poner `:latest` cuando corrijas el bug.

---

## Parte 6 · Usar esto como plantilla

Para otro proyecto **estático** basta copiar los 4 archivos y ajustar:

| Archivo | Qué cambiar |
|---|---|
| `Dockerfile` | Las líneas `COPY` con tus archivos/carpetas |
| `ci-cd.yml` step 3 | El texto que busca `grep` (algo que siempre aparezca en tu página) |
| `ci-cd.yml` `branches` | Las ramas que disparan el pipeline |
| Render | Image URL del servicio y el secret `RENDER_DEPLOY_HOOK_URL` |

Para una app **Node/Python/etc.** cambia solo el `Dockerfile` (otra imagen base + comando de arranque escuchando en `$PORT`); el workflow sirve igual.

### Checklist de la clase ✅

- [ ] `docker build` y `docker run` funcionan en local
- [ ] Practiqué tags, rollback y borrado de imágenes
- [ ] Push → Actions en verde
- [ ] Imagen visible en **Packages** y marcada como **Public**
- [ ] Servicio creado en Render desde la imagen de GHCR (URL `.onrender.com` funcionando)
- [ ] Secret `RENDER_DEPLOY_HOOK_URL` creado
- [ ] Cambio en `index.html` → push → se ve en la URL de Render sin tocar nada más

---

## Parte 7 · Configuración manual del entorno (trace)

Todo lo que **no** está automatizado y hay que hacer a mano, **en este orden** (el orden importa: el paquete en GHCR no existe hasta el primer push, y Render no puede usar la imagen hasta que sea pública).

| # | Dónde | Acción | Resultado esperado |
|---|---|---|---|
| 1 | Terminal | `git push -u origin DOCKERCICD` | Arranca el workflow en **Actions** |
| 2 | GitHub → **Actions** | Abrir la ejecución y esperar el job `build-test-push` | ✅ verde. El job `deploy-render` fallará (❌) porque aún no hay secret: **es normal** |
| 3 | GitHub → tu perfil → **Packages** → `pokemondemo` | Verificar tags `latest` y `sha-xxxxxxx` | La imagen existe en `ghcr.io/cristopherlarios/pokemondemo` |
| 4 | Package → **Package settings** → *Danger Zone* → **Change visibility** | Elegir **Public** y confirmar escribiendo el nombre | El paquete muestra la etiqueta *Public* |
| 5 | (Opcional) Package → **Package settings** → *Manage Actions access* | Verificar que el repo `Pokemondemo` tenga rol **Write** | Evita `permission_denied` en futuros push |
| 6 | Render → **+ New** → **Web Service** → **Existing Image** | Image URL `ghcr.io/cristopherlarios/pokemondemo:latest` → **Connect** | Render valida que puede descargar la imagen |
| 7 | Formulario del servicio | Name `pokemondemo`, Region cercana, Instance Type **Free** → **Deploy Web Service** | Primer deploy; log *Your service is live* |
| 8 | Arriba del servicio | Abrir la URL `https://pokemondemo-xxxx.onrender.com` | Se ve la app |
| 9–12 | Ver detalle abajo 👇 | Conectar GitHub Actions con Render | Cada push redespliega solo |

### Pasos 9–12 explicados: conectar GitHub con Render

**¿Por qué hace falta si la app ya está en línea?** Tras el paso 7 Render desplegó **una sola vez**. En el siguiente push, GitHub Actions sube una imagen `:latest` nueva a GHCR, pero **Render no se entera**. El job `deploy-render` le avisa llamando al **Deploy Hook**.

| Secret | Para qué | Analogía |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | URL secreta que ordena "redespliega este servicio" | El timbre + la llave en uno |

Va como **secret** porque el repo es público: escrito en el `.yml`, cualquiera podría redesplegar tu servicio.

**Paso 9 · Copiar el Deploy Hook (Render)**
1. Render → clic en el servicio `pokemondemo` → **Settings**.
2. Baja hasta **Deploy Hook**.
3. Copia la URL completa (`https://api.render.com/deploy/srv-...?key=...`). Incluye el `?key=...`.

**Paso 10 · Guardar el secret (GitHub)**
1. `github.com/<usuario>/Pokemondemo` → pestaña **Settings** del **repo** (no la del perfil).
2. Menú izquierdo: **Secrets and variables → Actions** → **New repository secret**.
3. Name `RENDER_DEPLOY_HOOK_URL`, Secret = URL del paso 9 → **Add secret**.
   > El nombre debe ser **exacto**: el `.yml` lo busca así.

**Paso 11 · Re-ejecutar el deploy (GitHub)**
1. Repo → pestaña **Actions** → clic en la ejecución con ❌.
2. Arriba a la derecha: **Re-run jobs → Re-run failed jobs**.
3. `deploy-render` queda ✅ y en Render → servicio → **Events** aparece *Deploy started… triggered via Deploy Hook*.

**Paso 12 · Prueba de punta a punta**
Cambia un texto visible de `index.html` → commit → push. Cuando Actions termine en verde (~2 min) y Render diga *live* (~1 min más), recarga la URL de Render: el cambio aparece **sin tocar Render**. Eso es CD.

**Registro de valores** (llénalo durante la clase; **nunca** escribas aquí la URL del hook):

```text
Imagen GHCR ........: ghcr.io/cristopherlarios/pokemondemo
Visibilidad ........: Public  [ ]
Servicio Render ....: ______________________
URL pública ........: https://______________________.onrender.com
Secret creado ......: RENDER_DEPLOY_HOOK_URL [ ]
Primer deploy CD OK : fecha ____/____/______  commit sha-_______
```

---

## Problemas frecuentes

| Síntoma | Causa / Solución |
|---|---|
| `port is already allocated` | Ese puerto ya está en uso: usa otro (`-p 8081:80`) o `docker rm -f` el contenedor viejo |
| `denied: permission_denied` al subir a GHCR | Falta `permissions: packages: write` en el job, o el paquete pertenece a otro repo (Package settings → *Manage Actions access*) |
| Render: *Unable to access image* / `failed to pull` | El paquete en GHCR sigue **privado** → hazlo público |
| Render: *No open ports detected* / *Timed out* | nginx no escucha en `$PORT`: revisa que la plantilla use `listen ${PORT};` |
| Job `deploy-render`: `curl: (22) ... 404` o `401` | `RENDER_DEPLOY_HOOK_URL` vacío o mal copiado (falta el `?key=...`) o fue regenerado |
| Render tarda mucho en abrir | Plan Free dormido: la primera visita lo despierta (~30–50 s) |
| Railway: `failed to pull image` | El paquete en GHCR sigue **privado** → hazlo público |
| Railway: *Application failed to respond* | nginx no escucha en `$PORT`: revisa que la plantilla use `listen ${PORT};` |
| Job deploy: `Unauthorized` / `invalid token` | `RAILWAY_TOKEN` mal copiado o es un token de cuenta en vez de **Project Token** |
| Railway no muestra el cambio | Revisa en *Deployments* que el deploy nuevo terminó; recarga sin caché (Ctrl+Shift+R) |
| `invalid reference format: repository name must be lowercase` | Usa nombres de imagen en minúsculas |

---

## Anexo · Railway (CD desactivado)

> El job `deploy-railway` sigue en `ci-cd.yml` pero **comentado**. Para volver a Railway: descomenta ese bloque, comenta `deploy-render` y sigue los pasos de abajo.

### A.1 Desplegar en Railway

**CI** = integración continua (construir + probar). **CD** = despliegue continuo (llevar a producción automáticamente).

#### 5.1 Crear el servicio en Railway (una sola vez, manual)

1. https://railway.com → **New Project** → **Empty Project**.
2. **+ Create** → **Docker Image** → escribe:
   `ghcr.io/cristopherlarios/pokemondemo:latest`
3. Espera el primer deploy.
4. En el servicio → **Settings → Networking → Generate Domain**. Railway asigna `PORT` automáticamente y nuestra imagen ya lo respeta.
5. Abre la URL generada 🎉

#### 5.2 Conectar GitHub Actions con Railway

Necesitamos dos **secrets** en GitHub:

| Secret | Dónde se obtiene |
|---|---|
| `RAILWAY_TOKEN` | Railway → tu proyecto → **Settings → Tokens** → *Create* (Project Token, entorno `production`) |
| `RAILWAY_SERVICE_ID` | Railway → clic en la tarjeta del servicio → copia lo que va después de `/service/` en la URL (o usa el nombre del servicio). Detalle en [A.2](#a2-configuración-manual-en-railway-trace) |

Guardarlos: GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**.

> 🔐 Nunca escribas tokens dentro del `.yml`: el repo es público. `secrets.*` se ocultan en los logs (`***`).

#### 5.3 El job de CD explicado

```yaml
  deploy-railway:
    needs: build-test-push                     # solo corre si el job 1 terminó OK
    if: github.event_name != 'pull_request'    # los PR no despliegan
    runs-on: ubuntu-latest
    container: ghcr.io/railwayapp/cli:latest   # el job corre dentro de la imagen oficial del CLI de Railway
    env:
      RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}   # el CLI lee el token de esta variable
    steps:
      - name: Redesplegar el servicio (descarga la nueva imagen :latest)
        run: railway redeploy --service ${{ secrets.RAILWAY_SERVICE_ID }} --yes
```

- `needs` crea la cadena **build → test → push → deploy**. Si falla la prueba, nunca llega a producción.
- `railway redeploy` le pide a Railway volver a desplegar el servicio, que descarga de nuevo `:latest` desde GHCR.
- `--yes` evita la pregunta interactiva de confirmación (en CI nadie puede contestar).

#### 5.4 Flujo completo

```text
git push
  └─▶ Job build-test-push
        1 checkout ─▶ 2 build ─▶ 3 test ─▶ 5 login ─▶ 6 tags ─▶ 7 push a ghcr.io
  └─▶ Job deploy-railway (needs)
        railway redeploy ─▶ Railway descarga :latest ─▶ nueva versión en línea
```

#### 5.5 Rollback en Railway

Opción A (rápida): Railway → servicio → **Deployments** → deploy anterior → **Redeploy**.
Opción B (por versión): Settings → Source → cambia la imagen a `ghcr.io/cristopherlarios/pokemondemo:sha-<commit-bueno>`.

### A.2 Configuración manual en Railway (trace)

Todo lo que **no** está automatizado y hay que hacer a mano, **en este orden** (el orden importa: el paquete en GHCR no existe hasta el primer push, y Railway no puede usar la imagen hasta que sea pública).

| # | Dónde | Acción | Resultado esperado |
|---|---|---|---|
| 1 | Terminal | `git push -u origin DOCKERCICD` | Arranca el workflow en **Actions** |
| 2 | GitHub → **Actions** | Abrir la ejecución y esperar el job `build-test-push` | ✅ verde. El job `deploy-railway` fallará (❌) porque aún no hay secrets: **es normal** |
| 3 | GitHub → tu perfil → **Packages** → `pokemondemo` | Verificar tags `latest` y `sha-xxxxxxx` | La imagen existe en `ghcr.io/cristopherlarios/pokemondemo` |
| 4 | Package → **Package settings** → *Danger Zone* → **Change visibility** | Elegir **Public** y confirmar escribiendo el nombre | El paquete muestra la etiqueta *Public* |
| 5 | (Opcional) Package → **Package settings** → *Manage Actions access* | Verificar que el repo `Pokemondemo` tenga rol **Write** | Evita `permission_denied` en futuros push |
| 6 | Railway → **New Project** → **Empty Project** | Crear el proyecto | Proyecto vacío en entorno `production` |
| 7 | Proyecto → **+ Create** → **Docker Image** | Escribir `ghcr.io/cristopherlarios/pokemondemo:latest` y Enter | Railway descarga la imagen y hace el primer deploy |
| 8 | Servicio → **Settings → Networking** → **Generate Domain** | Generar dominio público (si pide puerto, dejar el detectado o poner el valor de `PORT`) | URL tipo `https://pokemondemo-production.up.railway.app` que muestra la app |
| 9–14 | Ver detalle abajo 👇 | Conectar GitHub Actions con Railway | Cada push redespliega solo |

#### Pasos 9–14 explicados: conectar GitHub con Railway

**¿Qué es un "servicio"?** En Railway, el **proyecto** es la caja grande y cada **tarjeta** dentro de él es un **servicio** (un contenedor corriendo). En el paso 7 se creó la tarjeta `pokemondemo`: ese es nuestro servicio.

```text
Proyecto Railway
 └── Servicio "pokemondemo"  ← la tarjeta; corre ghcr.io/cristopherlarios/pokemondemo:latest
```

**¿Por qué hacen falta si la app ya está en línea?** Tras el paso 8 Railway desplegó **una sola vez**. En el siguiente push, GitHub Actions sube una imagen `:latest` nueva a GHCR, pero **Railway no se entera**. El job `deploy-railway` le avisa ("redespliega"), y para eso GitHub necesita:

| Secret | Para qué | Analogía |
|---|---|---|
| `RAILWAY_TOKEN` | Permiso para dar órdenes al proyecto | La llave de la casa |
| `RAILWAY_SERVICE_ID` | A qué servicio aplicar el redeploy | El número de la habitación |

Van como **secrets** porque el repo es público: escritos en el `.yml`, cualquiera podría usarlos.

**Paso 9 · Service ID (Railway)**
1. Abre el proyecto → clic en la tarjeta del servicio.
2. Mira la URL del navegador: `https://railway.com/project/<id-proyecto>/service/<ID-SERVICIO>?...`
3. Copia lo que está después de `/service/` (hasta el `?`). También sirve el **nombre** de la tarjeta (ej. `pokemondemo`).

**Paso 10 · Project Token (Railway)**
1. Dentro del proyecto → **Settings** del **proyecto** (barra superior, no el del servicio).
2. Pestaña **Tokens**.
3. Nombre `github-actions`, entorno **production** → **Create**.
4. Cópialo ya: no se vuelve a mostrar.

**Pasos 11 y 12 · Guardar los secrets (GitHub)**
1. `github.com/<usuario>/Pokemondemo` → pestaña **Settings** del **repo** (no la del perfil).
2. Menú izquierdo: **Secrets and variables → Actions** → **New repository secret**.
3. Name `RAILWAY_TOKEN`, Secret = token del paso 10 → **Add secret**.
4. Name `RAILWAY_SERVICE_ID`, Secret = ID del paso 9 → **Add secret**.
   > Los nombres deben ser **exactos**: el `.yml` los busca así.

**Paso 13 · Re-ejecutar el deploy (GitHub)**
1. Repo → pestaña **Actions** → clic en la ejecución con ❌.
2. Arriba a la derecha: **Re-run jobs → Re-run failed jobs**.
3. `deploy-railway` queda ✅ y en Railway → servicio → **Deployments** aparece un deploy nuevo.

**Paso 14 · Prueba de punta a punta**
Cambia un texto visible de `index.html` → commit → push. Cuando Actions termine en verde (~2 min), recarga la URL de Railway: el cambio aparece **sin tocar Railway**. Eso es CD.

**Registro de valores** (llénalo durante la clase; **nunca** escribas aquí el token):

```text
Imagen GHCR ........: ghcr.io/cristopherlarios/pokemondemo
Visibilidad ........: Public  [ ]
Proyecto Railway ...: ______________________
Servicio Railway ...: ______________________
URL pública ........: https://______________________
Secrets creados ....: RAILWAY_TOKEN [ ]   RAILWAY_SERVICE_ID [ ]
Primer deploy CD OK : fecha ____/____/______  commit sha-_______
```
