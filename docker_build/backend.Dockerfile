# Use uma imagem Python leve
FROM python:3.9-slim

# Defina o diretório de trabalho
WORKDIR /app

# Copie primeiro os ficheiros de requisitos para tirar partido da cache do Docker
COPY ../backend/requirements.txt .

# Instale as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copie o resto do código da aplicação
COPY ../backend/ /app/

# Exponha a porta onde a aplicação é executada
EXPOSE 8000

# Comando para executar a aplicação
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]