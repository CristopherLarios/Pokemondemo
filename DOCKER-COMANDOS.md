# 🐳 Docker desde la terminal — Demo paso a paso

> Guion demostrativo para clase. Ejecuta los bloques **en orden** desde la carpeta del proyecto.
> Complementa a [DOCKER-CICD.md](DOCKER-CICD.md).

```text
Dockerfile ──build──▶ Imagen ──run──▶ Contenedor ──▶ http://localhost:8081
 (receta)            (pastel)        (porción servida)
```

---

## 0 · Verificar que Docker funciona

```bash
docker --version        # versión del cliente
docker info             # si falla: abre Docker Desktop y espera a que arranque
```

Ubicarse en el proyecto (la ruta tiene espacios y `;`, por eso va entre comillas):

```bash
cd "ruta/a/Pokemondemo"
ls                       # debe aparecer el Dockerfile
```

---

## 1 · Construir la imagen (`build`)

```bash
docker build -t pokemondemo:1.0 .
```

| Parte | Significado |
|---|---|
| `build` | Construye una imagen leyendo el `Dockerfile` |
| `-t pokemondemo:1.0` | Nombre (`pokemondemo`) y tag/versión (`1.0`) |
| `.` | **Contexto**: la carpeta actual (lo que se puede copiar a la imagen) |

Verificar:

```bash
docker images pokemondemo
# REPOSITORY    TAG   IMAGE ID       CREATED          SIZE
# pokemondemo   1.0   da9c20c01366   10 seconds ago   ~50MB
```

---

## 2 · Correr un contenedor (`run`)

```bash
docker run -d --name pokemon -p 8081:80 pokemondemo:1.0
```

| Parte | Significado |
|---|---|
| `-d` | *detached*: corre en segundo plano y te devuelve la terminal |
| `--name pokemon` | Nombre para referirte al contenedor (si no, Docker inventa uno) |
| `-p 8081:80` | **puerto de tu PC : puerto del contenedor** |
| `pokemondemo:1.0` | Imagen a usar |

Abrir 👉 http://localhost:8081, o probar desde la terminal:

```bash
curl -I http://localhost:8081      # debe responder: HTTP/1.1 200 OK
```

### ⚠️ Error: `port is already allocated` / `address already in use`

```text
Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:8080
... bind: address already in use
```

**Causa:** otro programa ya usa ese puerto de tu PC (otro contenedor, un `python -m http.server`, etc.).

```bash
# ¿Quién usa el puerto?
lsof -nP -iTCP:8080 -sTCP:LISTEN      # macOS / Linux
docker ps                             # ¿es otro contenedor?
```

**Soluciones** (elige una):

```bash
# a) Usar otro puerto de tu PC (lo más fácil)
docker run -d --name pokemon -p 8081:80 pokemondemo:1.0

# b) Si lo ocupa un contenedor: borrarlo
docker rm -f <nombre-del-contenedor>

# c) Si lo ocupa otro programa: cerrarlo (PID sale en lsof)
kill <PID>
```

### ⚠️ Error: `The container name "/pokemon" is already in use`

Un `run` anterior que falló dejó creado el contenedor. Bórralo y repite:

```bash
docker rm -f pokemon
docker run -d --name pokemon -p 8081:80 pokemondemo:1.0
```

---

## 3 · Inspeccionar contenedores

```bash
docker ps                  # contenedores corriendo
docker ps -a               # todos, incluidos los detenidos
docker logs pokemon        # logs de nginx (cada visita al sitio deja una línea)
docker logs -f pokemon     # logs en vivo (Ctrl+C para salir)
docker stats pokemon       # CPU / RAM en vivo (Ctrl+C para salir)
```

Entrar **dentro** del contenedor:

```bash
docker exec -it pokemon sh
# ya estás dentro de Linux Alpine:
ls /usr/share/nginx/html          # tus archivos del sitio
cat /etc/nginx/conf.d/default.conf  # la config con el PORT ya reemplazado
exit                               # salir
```

---

## 4 · Detener, arrancar y borrar contenedores

```bash
docker stop pokemon        # detener (el contenedor sigue existiendo)
docker ps -a               # aparece como "Exited"
docker start pokemon       # volver a arrancarlo
docker restart pokemon     # reiniciar

docker rm pokemon          # borrar (falla si está corriendo)
docker rm -f pokemon       # detener + borrar en un solo paso
```

> 💡 Borrar un contenedor **no** borra la imagen: puedes crear otro cuando quieras.

---

## 5 · Versiones (tags) de imágenes

**Demo:** dos versiones de la app vivas al mismo tiempo.

```bash
# 1. Versión 1.0 en el puerto 8081
docker run -d --name pokemon-v1 -p 8081:80 pokemondemo:1.0

# 2. Edita index.html (cambia el <h1>) y construye la 1.1
docker build -t pokemondemo:1.1 .

# 3. Versión 1.1 en el puerto 8082
docker run -d --name pokemon-v2 -p 8082:80 pokemondemo:1.1

# 4. Compara http://localhost:8081 vs http://localhost:8082
```

Etiquetar una versión como `latest`:

```bash
docker tag pokemondemo:1.1 pokemondemo:latest
docker images pokemondemo
# pokemondemo   1.1      a1b2c3d4e5f6   <- mismo IMAGE ID
# pokemondemo   latest   a1b2c3d4e5f6   <- (un tag es solo una etiqueta)
# pokemondemo   1.0      da9c20c01366
```

Rollback (volver a la 1.0):

```bash
docker rm -f pokemon-v2
docker run -d --name pokemon-v2 -p 8082:80 pokemondemo:1.0
```

Ver las capas de una imagen:

```bash
docker history pokemondemo:1.0
```

---

## 6 · Variables de entorno (`-e`)

Nuestra imagen escucha en el puerto que diga `PORT` (así funciona Railway). Simularlo:

```bash
docker run -d --name pokemon-railway -e PORT=9000 -p 9000:9000 pokemondemo:1.0
curl -I http://localhost:9000      # 200 OK
```

---

## 7 · Descargar imágenes de un registro (`pull`)

```bash
# La imagen que publicó GitHub Actions en GHCR
docker pull ghcr.io/cristopherlarios/pokemondemo:latest
docker run -d --name pokemon-ghcr -p 8083:80 ghcr.io/cristopherlarios/pokemondemo:latest

# Cualquier imagen pública de Docker Hub
docker pull nginx:1.27-alpine
```

---

## 8 · Limpieza 🧹

```bash
# Borrar los contenedores de la demo
docker rm -f pokemon pokemon-v1 pokemon-v2 pokemon-railway pokemon-ghcr

# Borrar imágenes
docker rmi pokemondemo:1.0 pokemondemo:1.1 pokemondemo:latest
# (si dice "image is being used by a container": borra primero el contenedor)

# Limpieza general
docker image prune         # imágenes huérfanas (<none>)
docker container prune     # contenedores detenidos
docker system df           # cuánto espacio usa Docker
docker system prune        # ⚠️ borra todo lo que no esté en uso
```

---

## 📋 Chuleta

| Quiero... | Comando |
|---|---|
| Construir | `docker build -t nombre:tag .` |
| Correr | `docker run -d --name app -p 8081:80 nombre:tag` |
| Ver corriendo / todos | `docker ps` / `docker ps -a` |
| Ver logs | `docker logs -f app` |
| Entrar al contenedor | `docker exec -it app sh` |
| Detener / arrancar | `docker stop app` / `docker start app` |
| Borrar contenedor | `docker rm -f app` |
| Listar imágenes | `docker images` |
| Nueva etiqueta | `docker tag origen:tag destino:tag` |
| Borrar imagen | `docker rmi nombre:tag` |
| Descargar imagen | `docker pull imagen:tag` |
| ¿Quién usa el puerto? | `lsof -nP -iTCP:8080 -sTCP:LISTEN` |
