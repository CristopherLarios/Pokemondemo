# Imagen base: nginx sobre Alpine Linux (liviana, ~20 MB)
FROM nginx:1.27-alpine

# Railway inyecta la variable PORT; en local usamos 80 por defecto
ENV PORT=80

# Plantilla de configuración: nginx reemplaza ${PORT} al arrancar el contenedor
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template

# Archivos estáticos de la app
COPY index.html github.html test.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 80