# Use a imagem oficial do Nginx
FROM nginx:alpine

# Copie os ficheiros estáticos do frontend para o diretório de serviço do Nginx
COPY ../frontend/ /usr/share/nginx/html/

# Copie a configuração personalizada do Nginx
COPY ./nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Exponha a porta 80 para o tráfego HTTP
EXPOSE 80

# O comando de arranque é gerido pela imagem de base do Nginx
CMD ["nginx", "-g", "daemon off;"]