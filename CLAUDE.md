# CLAUDE.md

Regras permanentes de trabalho para quem altera este projeto — pessoa ou
agente de IA. Atualizado em 13 out 2026.

## Leia primeiro (e só isto é obrigatório)

1. `docs/PRODUTO.md` — o que é o produto e as 11 telas.
2. `docs/REGRAS.md` — as regras inegociáveis e o teste que garante cada uma.
3. `docs/ROTEIRO.md` — a lista única de etapas e o que já está feito.

Todos os outros arquivos em `docs/` (Constituição, Blueprint, Design Bible,
relatórios M6–M8, ADRs em `docs/decisions/`, `development-roadmap.md`) são
**histórico**. Servem para consulta; não são lei e não bloqueiam trabalho. Se
contradizem os três documentos acima, valem os três.

## O fundador

- Fernando não é programador. Escreva para ele em português do Brasil, em
  linguagem simples, sem jargão.
- Ele não usa Terminal. Ele trabalha pelo app do Claude, pelo VS Code (botões
  Commit / Sync Changes) e pelo navegador.

## Como o trabalho anda

- O código mora no GitHub (`oRussoYT/nodes-of-knowlegde`). Os testes rodam
  sozinhos no GitHub Actions (`.github/workflows/testes.yml`) a cada envio.
- A publicação é pela **Netlify** (não Vercel) com Supabase hospedado.
- Nada vai para a branch principal com teste vermelho.
- Cada etapa do `ROTEIRO.md` termina com um link que o fundador abre.
- Ideia nova fora do plano vai para a lista "Depois" do `ROTEIRO.md`, sem
  documento novo.

## Stack

- Next.js, TypeScript, PostgreSQL, Supabase, Tailwind CSS.
- Toda mudança de banco é uma migração nova em `supabase/migrations/`. Nunca
  editar migração antiga; nunca mudar o banco à mão.
- Server Components por padrão; Client Components só onde a interação exige.

## Segurança e privacidade

- Nunca desligar Row Level Security em produção.
- Nunca expor chave secreta / service-role em código que vai ao navegador.
- Todo dado pessoal novo precisa de nível de visibilidade decidido.
- Escritas administrativas precisam poder ser auditadas.

## Modelo de dados

- Pessoa ≠ conta. Uma pessoa existe com ou sem conta.
- Uma pessoa pode ter vários períodos e papéis; nunca um intervalo único.
- Proposto/inferido nunca vira confirmado sem um humano. Os dois estados ficam
  distintos no banco e na tela.
- Vocabulários controlados ficam no banco/config, não dentro de componentes.
- Nunca ranquear pessoas.
- Dados atuais são fictícios (demonstração): sempre marcados como tal.

## Código

- Lógica fora dos componentes de apresentação (`src/features`, `src/lib`).
- Não adicionar dependência sem explicar por quê.
- Mudanças com escopo fechado no que foi pedido.
- Funcionalidade nova vem com teste.
