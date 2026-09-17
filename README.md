# Logchip

SaaS de gestão de frotas voltado para contratos com prefeituras.

Prefeitura de Ribeira do Amparo (BA).

## Objetivos

- Reduzir desvio de combustível
- Reduzir multas de trânsito não atribuídas ao condutor responsável
- Reduzir tempo ocioso dos veículos

## Módulos

- **FICI** (Ficha de Identificação do Condutor Infrator) — atribuição de multas ao condutor responsável. Módulo carro-chefe do piloto.
- Combustível — controle e detecção de desvio (planejado).
- Tempo ocioso — monitoramento de utilização da frota (planejado).

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
cp .env.example .env   # configurar DATABASE_URL
npx prisma migrate dev
npm run db:seed        # popula um tenant de demonstração ("ribeira-do-amparo")
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000).
