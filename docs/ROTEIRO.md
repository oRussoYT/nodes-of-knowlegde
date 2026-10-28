# ROTEIRO — a lista única de etapas

> Substitui todas as listas de milestones anteriores (M1–M9 de agosto,
> Founding Plan M1–M11, Master Plan M1–M14, Revisão 3). Etapas têm **nome**,
> não número de milestone. Cada etapa só termina quando existe **um link** que
> o fundador abre no navegador.
>
> Atualizado: 28 out 2026 — alinhamento: o produto final é o Nodes of
> Knowledge completo (ver `PRODUTO.md`, "Decisão de 28 out 2026").

## Já feito (base que serve a qualquer versão do produto)

Construído entre agosto e setembro de 2026 (antigas M1–M8 e fundação de
curadoria):

- Entrada, cadastro, login, recuperação de senha.
- Pessoa ≠ conta; reivindicação de perfil com revisão humana.
- Biografia, linha do tempo com datas incertas, participações, relações,
  instituições (com nomes históricos), ~30 tipos de contribuição.
- Rede e revelações: co-presença (quem esteve junto, onde e quando),
  gerações, linhagem, continuidade, recorrência, caminhos.
- Privacidade por dado (RLS), sistema visual com ~26 componentes acessíveis.

Feito no Mac em agosto e **não enviado ao GitHub** (29 entregas). Em 13 out
2026 decidiu-se não depender do Mac: o que for necessário é **refeito** aqui,
etapa por etapa — fundação de curadoria (caminho de contribuição
candidato → revisão → registro), console do steward (contagens,
distribuições, linha do tempo do acervo), proteção extra nas páginas de
pessoa, tela de nomes históricos de instituições, marcação + limpeza dos
dados de demonstração.

Refeito em 17 out 2026 (testado num PostgreSQL 16 real, 747 verificações do
banco passando): console do steward (`20261017090000_add_steward_console.sql`)
e marcação + limpeza dos dados de demonstração
(`20261017100000_add_demo_marking.sql`; a limpeza é `select
wipe_demo_data();`, rodada só pelo painel do Supabase).

## Fase 1 — base (feita, 13–23 out 2026)

| Etapa | O que o fundador vê no final | Situação |
|---|---|---|
| **0. Resgate e faxina** | Todo o trabalho do Mac salvo no GitHub; 3 documentos (PRODUTO, REGRAS, ROTEIRO) no lugar de 67; regras novas no `CLAUDE.md` | **quase pronta** — 3 documentos escritos, `CLAUDE.md` reescrito, nome trocado para "Nodes BDFFP", documentos antigos movidos para `docs/arquivo/`, código no GitHub (`oRussoYT/nodes-of-knowlegde`). Peças do Mac refeitas: console, dados de demonstração, nomes históricos das instituições (`/review/names`) e caminho de contribuição candidato → revisão → registro (a pessoa propõe em `/member/contributions`, o steward decide em `/review/contributions`; ninguém aprova a própria proposta), 21 out. Falta: proteção extra nas páginas de pessoa (definir o que é) |
| **1. Linha de produção na nuvem** | O app atual num endereço real (Cloudflare Pages; antes Netlify), com dados de demonstração; testes rodando sozinhos no GitHub a cada mudança | **pronta** (21 out; mudou para a Cloudflare Pages em 22 out porque a Netlify pausou por falta de créditos): https://nodes-bdffp.pages.dev — a Cloudflare publica sozinha a cada envio à `main`; o banco (Supabase hospedado) recebe as migrações novas pela integração GitHub do Supabase; dados de demonstração carregados (11 pessoas, 3 instituições, todos marcados) |
| **2. Vitrine pública** | Página de pessoa e de programa abertas sem login (telas 01 e 07) | **pronta** (17 out): página pública de pessoa (`/p/[id]`, só com publicação deliberada e registrada) e páginas de programa (`/programmes`), publicadas pela própria instituição, **só com números, sem nomes**, sem contar quem pediu para não ser listado. Também: faixa de resumo e tela de trajetória (tela 10). Página inicial refeita (21 out): o que a universidade recebe em 4 passos, desenho animado discreto da rede, links para as páginas públicas e rodapé |
| **3. Várias instituições** | Cada universidade com seus dados, separados, no mesmo sistema | **pronta** (17 out): stewards por instituição (nomeados e removidos só por revisores da plataforma, em `/review/stewards`), console, importação e publicação limitados à própria instituição; fila de reivindicações continua só da plataforma. Um registro só, vários guardiões |
| **4. Dados reais entrando** | Uma planilha de formados vira perfis, cruzados com ORCID e OpenAlex, com fila de conferência humana | **pronta** (17 out): subir a lista (CSV em inglês ou português) → conferência linha a linha em `/review/import` (mesma pessoa / pessoa nova / pular) → "Onde eles foram": busca no OpenAlex (traz ORCID junto), cada resultado com os motivos; aceitar grava identificadores e a instituição mais recente com ano e fonte. Precisa do site no ar para a busca funcionar |
| → **Ponto de decisão** | Teste de cobertura: que % de uma turma real o sistema acha sozinho? | **primeiro teste feito** (21 out): 11 doutores de Biologia da McGill formados em 2018 (página 1 do eScholarship) → 6 com destino confirmado (55%), 2 prováveis, 3 sem rastro. Acha bem quem segue publicando; não acha quem saiu da academia (é para isso o link de confirmação). Lição: homônimos — 3 aceites errados, desfeitos com o novo "Undo". Próximo: amostra maior (18+) antes de decidir |
| **5. Painel que se vende** | Encontrados / prováveis / precisam de alguém, horas economizadas, cortes por programa, exportações (tela 09) | **pronta** (17 out): `/review/outcomes` — formados no registro, encontrados / prováveis / precisam de alguém, tempo economizado (referência declarada: ~10 min por pessoa, estudo da UCSF), recortes por setor, país, ano e programa, destinos em ordem alfabética, exportação CSV com fonte por linha (cada exportação fica registrada). Base: console do steward |
| **6. Confirmação pelo egresso** | E-mail ao ex-aluno; ele confirma ou corrige a própria trajetória (tela 02) | **pronta** (17 out): o steward cria um link privado por formado (na tela da lista) e o envia pelo canal que já usa; o formado abre sem conta e responde "está certo", "algo está errado" (com nota) ou "não me liste" (a página sai do ar na hora e ele sai das contagens públicas). Uso único, vale 90 dias, tudo registrado. Envio automático de e-mail fica para quando houver um serviço de e-mail configurado |
| **7. Sugestões com o porquê** | Colaboradores e parcerias sugeridos, sempre com a razão, nunca ranqueados (telas 08 e 11) | **pronta (primeira versão)** (17 out): `/member/suggestions` — pessoas documentadas no mesmo lugar e na mesma época, ou formadas pelo mesmo orientador; cada uma com o motivo; "agora não" e "me deixe fora das sugestões de todos". Não escreve nada no registro |

Também feito depois (22–23 out): site na Cloudflare Pages; dados fictícios
apagados; perfil com foto e "Acesso e segurança"; visual de dentro refeito;
história da pessoa trazida do OpenAlex e do ROR; busca de pessoas; mensagens
entre membros; 42 instituições de referência.

## Fase 2 — o produto completo (cronograma intensivo, 28 out 2026 → ~8 jan 2027)

Cada etapa termina com um link funcionando. As letras evitam confusão com a
fase 1.

| Etapa | O que o fundador vê no final | Prazo | Situação |
|---|---|---|---|
| **A. Alinhamento** | `PRODUTO.md` e `ROTEIRO.md` com a visão completa; testes mais rápidos | 29 out | feito (28 out) |
| **B. Os Nós** | Nó PDBFF com página, identidade e responsáveis próprios; "Entrar no PDBFF" (conta única); plano gratuito ou pago por Nó | 3 nov | feito (28 out) |
| **C. Revelações visíveis** | Coortes, linhagem, descendentes, continuidade, recorrência e caminhos em destaque; "você tem N descendentes" ao reivindicar; abrir uma ligação com as fontes e escondê-la | 3 nov | feito (28 out) |
| **D. Entrada do conhecimento** | "Trabalhei com o João"; envio de documentos, fotos e CV; Lattes e ORCID; IA que extrai para revisão; fila única de revisão | 17 nov | feito (28 out) — IA liga quando a chave for colada |
| **E. Pacote universidade** | Graduação, mestrado e doutorado; relatórios CAPES e indicadores de rankings; console completo; planos e cobrança → **versão vendável** | 17 nov | feito (28 out) — cobrança: falta conta de pagamento |
| **F. Tudo tem história** | Páginas de projetos, estações, expedições, coleções, espécies, fotos, documentos, mapas antigos e histórias orais | 1 dez | feito (28 out) |
| **G. Mapas** | Onde estão hoje; mapa no tempo ("em 1994, 37 pessoas estavam aqui"); migrações e carreiras | 1 dez | feito (28 out) |
| **H. Observatório** | Números e evolução de cada Nó; difusão do conhecimento | 15 dez | feito (28 out) |
| **I. IA de conexões** | Pessoas, temas, métodos, organismos e lugares afins, dentro e fora da instituição; sempre com o motivo | 15 dez | feito (28 out) — sugestões por IA ligam com a chave |
| **J. Editais e bolsas** | Editais nacionais e internacionais combinados com o histórico da pessoa ou do grupo | 15 dez | feito (28 out) |
| **K. Bibliotecário de IA** | Perguntas com fontes, resumos, comparações, ajuda a arquivistas e ao ensino | 22 dez | feito (28 out) — respostas escritas pela IA ligam com a chave; sem ela, mostra as fontes |
| **L. Espaço privado de pesquisa** | Notas, PDFs, entrevistas e hipóteses; envio para revisão quando pronto | 22 dez | feito (28 out) |
| **M. Privacidade avançada e rede** | Revelações limitadas pelo consentimento; material sensível e soberania indígena; fórum; conexão entre Nós | 22 dez | feito (28 out) |
| **N. Segundo Nó e comparações** | Cocha Cashu ou Mamirauá no mesmo motor; história comparada; revisão final → **produto completo** | ~8 jan 2027 | motor pronto (28 out): criar Nó em /review/nodes e comparar em /compare — falta o contato do segundo Nó |

O que depende do fundador: material real (listas de pessoas, teses,
relatórios); decisões de custo (assinatura de IA na etapa D, conta de
cobrança na E); um contato num segundo Nó (etapa N).

## Como se trabalha

1. O fundador pede algo no app do Claude.
2. O Claude altera os arquivos na pasta do projeto.
3. O fundador, no VS Code, escreve a mensagem e clica **Commit** e depois
   **Sync Changes**.
4. O GitHub roda os testes sozinho (aba **Actions**). Verde = pode seguir;
   vermelho = o Claude corrige.
5. A Cloudflare Pages publica sozinha a versão nova (o banco recebe as
   migrações pela integração do Supabase).

## O que saiu do plano

- Auditoria "constitucional" antes de cada etapa e os 67 documentos →
  substituídos por 3 documentos, testes e publicação contínua.
- Recomeçar do zero num repositório novo → descartado.
- O vigia do Terminal (`ship-watch.sh`) → substituído pelos testes no GitHub.
- (Em 28 out 2026 voltaram ao plano: vários Nós, interpretação por IA,
  arquivo de fotos e documentos — agora nas etapas B, K e F.)

## Depois (ideias guardadas, sem documento)

- Triagem de conflito de interesse / integridade.
- Ajudar o pesquisador a declarar vínculos corretamente (NIH Other Support,
  NSF Current and Pending).
- API pública, ROR, Wikidata.
- Interpretação assinada sobre o registro (parte da etapa K).
