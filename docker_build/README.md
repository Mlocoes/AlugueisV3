# AlugueisV3 - Construção com Docker

Este diretório contém uma configuração simplificada do Docker para construir e executar a aplicação AlugueisV3.

## Pré-requisitos

- Docker
- Docker Compose

## Como Executar

1.  **Navegue até este diretório:**

    ```bash
    cd docker_build
    ```

2.  **Construa e inicie os contentores:**

    ```bash
    docker-compose up --build
    ```

    Este comando irá construir as imagens para o frontend e o backend e iniciar todos os serviços.

3.  **Aceda à aplicação:**

    *   **Frontend:** [http://localhost:8080](http://localhost:8080)
    *   **Backend (API):** [http://localhost:8000/docs](http://localhost:8000/docs)

## Serviços

*   **`frontend`**: Um contentor Nginx que serve os ficheiros estáticos da aplicação.
*   **`backend`**: Um contentor Python com a aplicação FastAPI.
*   **`postgres`**: Um contentor com a base de dados PostgreSQL.

## Parar a Aplicação

Para parar os contentores, prima `Ctrl+C` no terminal onde executou o `docker-compose up` e, em seguida, execute:

```bash
docker-compose down
```

Isto irá parar e remover os contentores. O volume da base de dados (`postgres_data`) será preservado. Para remover também o volume, execute `docker-compose down -v`.