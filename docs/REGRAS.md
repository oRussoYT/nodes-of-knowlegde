# REGRAS — o que não se negocia

> Estas regras substituem a Constituição como lei do projeto. Cada uma tem
> que estar garantida por um **teste automático**: se alguém quebrar a regra,
> um teste fica vermelho no GitHub. Uma regra sem teste é uma tarefa pendente
> (marcada abaixo como **falta teste**).
>
> Testes de banco ficam em `supabase/tests/database/`; testes de código em
> `tests/unit/`; testes de tela em `tests/e2e/`.

| # | Regra | Garantida por |
|---|---|---|
| 1 | **Pessoa ≠ conta.** Uma pessoa existe no registro com ou sem conta; uma conta só vira dona de uma pessoa por reivindicação aprovada por um revisor. | `identity_foundation.test.sql`, `claim_review.test.sql`, `e2e/claim-review.spec.ts` |
| 2 | **Toda afirmação tem origem.** Todo fato, ligação ou contribuição guarda de onde veio (proveniência) — nada entra "solto". | `scientific_biography.test.sql`, `timeline.test.sql`, `relationships.test.sql`, `contribution.test.sql`, `unit/provenance-presentation-consistency.test.ts` |
| 3 | **Ligação documentada, não declarada.** Nenhuma ligação entre pessoas é criada por clique; ela é derivada de registros com evidência. | `knowledge_network.test.sql`, `revelation*.test.sql` |
| 4 | **Proposta não é fato.** Nada sugerido pelo sistema (ou por IA) entra no registro sem confirmação humana; recusas são lembradas. | `claim_review.test.sql` (fila de revisão), `steward_console.test.sql` (possíveis duplicatas só listadas, nunca fundidas), `graduate_import.test.sql` (importação só propõe; a pessoa decide), `external_matching.test.sql` (fontes externas só propõem) · **falta teste** para sugestões (tela 08) |
| 5 | **Nunca ranquear pessoas.** Nenhuma consulta devolve pontuação, posição ou "melhor"; listas seguem uma ordem escolhida pela pessoa ou neutra (alfabética/cronológica). | `unit/revelation-constitutional-closure.test.ts` (parcial) · **falta teste** de banco geral |
| 6 | **Privacidade por padrão.** Cada dado pessoal tem nível de visibilidade; o banco só entrega o que quem pede pode ver (RLS ligada sempre). | `identity_foundation.test.sql`, `participation.test.sql`, `reading_index.test.sql`, `public_person_pages.test.sql` (nada é público por padrão; publicar exige decisão registrada), `institution_stewards.test.sql` (cada steward só alcança a própria instituição) |
| 7 | **Dignidade igual.** Técnico, mateiro e pesquisador-chefe têm o mesmo tipo de página e as mesmas proteções; publicação é só um dos ~30 tipos de contribuição. | `contribution.test.sql`, `unit/contribution-parse.test.ts` |
| 8 | **Datas podem ser incertas.** O sistema aceita "c. 1987", intervalos e "antes de" sem inventar precisão. | `timeline.test.sql`, `unit/timeline-temporal.test.ts` |
| 9 | **Correção por substituição, não por apagamento.** Corrigir um fato cria uma versão nova e mantém a antiga rastreável. | **falta teste** |
| 10 | **Saída sempre aberta.** Uma instituição consegue exportar todo o seu registro, com proveniência, a qualquer momento. | `outcomes.test.sql` (exportação de formados com fonte por linha) · **falta** exportação do registro inteiro |
| 11 | **Demonstração marcada e apagável.** Dado fictício é sempre identificado como tal e existe um caminho testado para zerar tudo. | `demo_marking.test.sql` |
| 12 | **Segredos nunca no navegador.** Chave secreta do Supabase nunca aparece em código que roda no navegador. | revisão de código + `unit/route-protection.test.ts` |

## Regras de trabalho (para quem mexe no código, inclusive o Claude)

- Toda mudança de banco é uma migração nova em `supabase/migrations/`; nunca
  editar migração antiga.
- Nada vai para a branch principal com teste vermelho.
- Um documento por etapa: a entrada no `ROTEIRO.md`. Sem relatórios de
  relatórios.
- Ideia nova fora do plano vai para a lista "depois" do `ROTEIRO.md`, sem
  documento novo. Mudança de rumo só nos pontos de decisão.
