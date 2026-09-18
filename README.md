# Logchip

SaaS de gestão de frotas voltado para contratos com prefeituras.

Prefeitura de Ribeira do Amparo (BA).

## Objetivos

- Reduzir desvio de combustível
- Reduzir multas de trânsito não atribuídas ao condutor responsável
- Reduzir tempo ocioso dos veículos

## Módulos

- **FICI** (Ficha de Identificação do Condutor Infrator) — atribuição de multas ao condutor responsável. Módulo carro-chefe do piloto.
- **Combustível** — registra abastecimentos (hodômetro, litros, valor, posto) e sinaliza abastecimento suspeito quando o volume foge muito do esperado para o km rodado desde o abastecimento anterior, com base no consumo médio (km/l) cadastrado no veículo.
- **Tempo ocioso** — registra períodos em que o veículo ficou ligado e parado (início, fim, condutor e local opcionais) e sinaliza ociosidade excessiva quando a duração passa de 15 minutos.

Todos os três módulos suportam cadastro manual pela interface e importação em lote via planilha (Excel/CSV), com validação linha a linha.

## Stack

- Next.js (App Router, TypeScript)
- Prisma + PostgreSQL
- Tailwind CSS
- Deploy: Vercel + Neon

## Arquitetura

O sistema é multi-tenant desde o início: cada prefeitura/cliente é um `Tenant`, e todos os dados operacionais (veículos, condutores, multas) são isolados por `tenantId`.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL e SESSION_SECRET
docker compose up -d   # sobe um Postgres local (opcional, se não tiver um banco à mão)
npx prisma db push     # aplica o schema no banco (projeto não usa migrations)
npm run db:seed        # popula um tenant de demonstração ("ribeira-do-amparo") e um usuário de acesso
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000) e faça login com:

- Prefeitura: `ribeira-do-amparo`
- Email: `admin@ribeira-do-amparo.gov.br`
- Senha: `logchip123`
