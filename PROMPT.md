# Prompt Detalhado para Criação do Sistema AlugueisV3

## Visão Geral do Projeto

O AlugueisV3 é um sistema completo de gerenciamento de aluguéis, projetado para ser robusto, seguro, escalável e eficiente. O sistema abrangerá desde o gerenciamento de imóveis e inquilinos até a gestão financeira e geração de relatórios. A arquitetura será baseada em contêineres Docker, com um backend em FastAPI e um frontend moderno com JavaScript.

## 1. Base de Dados

A base de dados será o coração do sistema, armazenando todas as informações de forma segura e estruturada.

- **Tecnologia:** Utilize **PostgreSQL** na sua versão estável mais recente, executando em um contêiner Docker.
- **Modelagem de Dados:** Crie um diagrama entidade-relacionamento (DER) que contemple as seguintes entidades:
    - `Imoveis`: com informações como endereço, tipo (casa, apartamento), número de quartos, banheiros, valor do aluguel, status (disponível, alugado, em manutenção).
    - `Inquilinos`: com dados pessoais (nome, CPF, contato), e um histórico de aluguéis.
    - `Proprietarios`: informações dos donos dos imóveis.
    - `Contratos`: detalhes do aluguel, como data de início e término, valor acordado, garantias, e referências ao imóvel e inquilino.
    - `Financeiro`: registros de todas as transações, como pagamentos de aluguel, taxas, despesas com manutenção. Deve ser possível rastrear o fluxo de caixa por imóvel.
    - `Usuarios`: para acesso ao sistema, com diferentes níveis de permissão (administrador, gerente, inquilino).
- **Segurança:**
    - Utilize senhas com hash (Argon2 ou bcrypt).
    - Implemente uma política de backups periódicos e automáticos.
    - Conexões com o banco de dados devem usar SSL/TLS.
- **Otimização:**
    - Crie índices nas colunas que serão frequentemente consultadas (ex: `CPF` de inquilinos, `status` de imóveis).
    - Utilize `SQLAlchemy` no backend para um ORM eficiente e seguro.

## 2. Backend

O backend será a API RESTful que servirá o frontend e processará todas as regras de negócio.

- **Tecnologia:**
    - **Python 3.11+** com **FastAPI**, pela sua alta performance e facilidade de uso.
    - **SQLAlchemy** para a camada de acesso a dados.
    - **Pydantic** para validação de dados.
    - Servidor web **Uvicorn** com **Gunicorn** para produção.
- **Estrutura de Endpoints:**
    - Crie endpoints CRUD (Create, Read, Update, Delete) para cada uma das entidades principais: `imoveis`, `inquilinos`, `proprietarios`, `contratos`.
    - Endpoint de autenticação (`/token`) utilizando **JWT (JSON Web Tokens)** com tempo de expiração curto e refresh tokens.
    - Endpoints para operações complexas, como:
        - `POST /contratos/{id}/registrar_pagamento`
        - `GET /imoveis/disponiveis`
        - `GET /dashboard/overview` (para retornar dados agregados para o painel principal).
- **Segurança:**
    - Implemente autenticação e autorização em todos os endpoints sensíveis usando `FastAPI Dependencies`.
    - Valide e sanitize todos os dados de entrada para prevenir injeção de SQL e XSS.
    - Utilize `CORS (Cross-Origin Resource Sharing)` para permitir o acesso apenas do domínio do frontend.
    - Integre a ferramenta `Bandit` no processo de CI/CD para análise estática de vulnerabilidades no código Python.
    - Utilize `Safety` para verificar vulnerabilidades nas dependências do projeto.
- **Otimização:**
    - Implemente paginação para endpoints que retornam listas de dados.
    - Utilize o sistema de tarefas assíncronas do FastAPI para operações longas (ex: geração de relatórios).
    - Considere um sistema de cache (com Redis) para dados frequentemente acessados e que não mudam com frequência.

## 3. Frontend

O frontend será uma Single Page Application (SPA) interativa e responsiva.

- **Tecnologia:**
    - **HTML5**, **CSS3** e **JavaScript (ES6+)** sem frameworks (vanilla JS) para ter total controle e máxima performance.
    - **Bootstrap 5** para um design responsivo e moderno.
    - **Chart.js** para a criação de gráficos e dashboards.
    - **Vite** como build tool para desenvolvimento rápido e otimizado.
- **Estrutura de Componentes:**
    - Crie componentes reutilizáveis para elementos comuns da interface, como tabelas, modais, e formulários.
    - `GridComponent.js`: um componente de tabela reutilizável que suporte paginação, ordenação e filtros.
    - `ApiService.js`: um módulo central para realizar todas as chamadas à API backend, gerenciando tokens de autenticação e erros.
    - `CacheService.js`: um serviço para implementar cache no lado do cliente (usando `localStorage` ou `sessionStorage`) para dados como listas de imóveis, evitando requisições repetidas.
- **Funcionalidades:**
    - Dashboard principal com gráficos (imóveis alugados vs. disponíveis, fluxo de caixa mensal).
    - Telas de gerenciamento para cada entidade (imóveis, inquilinos, etc.) com busca e filtros.
    - Formulários com validação em tempo real.
    - Design totalmente responsivo, adaptável para desktops, tablets e smartphones.
- **Segurança:**
    - Armazene JWTs em `HttpOnly cookies` para prevenir ataques XSS.
    - Sanitize qualquer dado exibido na tela para evitar a renderização de HTML/JS malicioso.
- **Otimização:**
    - Utilize "lazy loading" para imagens e componentes não essenciais.
    - Minifique os arquivos CSS e JavaScript para produção.
    - Utilize a ferramenta `jscpd` para detectar e refatorar código duplicado.

## 4. Otimização e Boas Práticas Gerais

- **Containerização:** Utilize **Docker** e **Docker Compose** para orquestrar todos os serviços (backend, frontend, banco de dados). Crie um `Dockerfile` otimizado para cada serviço.
- **CI/CD:** Configure um pipeline de integração e entrega contínua (usando GitHub Actions, GitLab CI, etc.) que execute:
    - **Linting:** (ex: `Flake8` para Python, `ESLint` para JS).
    - **Testes automatizados:** testes unitários e de integração.
    - **Análise de segurança:** `Bandit`, `Safety`, e `jscpd`.
    - **Build e deploy** automatizados para um ambiente de staging/produção.
- **Instalação:** Desenvolva o script `scripts/install.py` para automatizar a configuração inicial do ambiente de desenvolvimento, incluindo a criação de um usuário administrador padrão.
- **Documentação:** Crie uma documentação clara da API (o FastAPI gera automaticamente), e um `README.md` detalhado sobre como configurar e executar o projeto.

Este prompt serve como um guia completo para o desenvolvimento do sistema AlugueisV3. O foco deve ser em criar um produto final que não seja apenas funcional, mas também seguro, performático e de fácil manutenção.