# PRODUTO — o que é o Nodes of Knowledge

> Documento único de produto. Substitui, como guia de trabalho diário, a
> Constituição, o Product Blueprint e a Design Bible (que ficam guardados como
> história em `docs/arquivo/`). Se algo aqui contradiz um documento antigo,
> vale este.

## Em uma frase

Um registro público e documentado das pessoas que produzem conhecimento e das
ligações entre elas — quem formou quem, quem trabalhou junto com quem, onde e
quando — gratuito para indivíduos, legível por qualquer pessoa, e vendido a
instituições que precisam cuidar e usar a sua parte desse registro.

A lacuna que ele ocupa:

| Quem | Registra |
|---|---|
| ORCID | quem você é |
| Crossref, OpenAlex | o que você publicou |
| **ninguém** | **com quem você fez, quem te formou e onde vocês estavam** |

## Três propriedades que separam o produto de tudo ao lado

1. **Documentado, não declarado.** Uma ligação entre duas pessoas existe
   porque algo a documenta (tese, afiliação sobreposta, registro de projeto,
   agradecimento, foto). Ninguém cria uma conexão clicando num botão.
2. **Guarda pessoas que não são usuárias.** Não cadastrados, aposentados,
   falecidos, técnicos e mateiros que nunca assinaram um artigo. A página de
   uma pessoa existe antes de ela entrar no sistema. **Pessoa ≠ conta.**
3. **O sabido e o suposto nunca se misturam.** O sistema propõe; só um humano
   confirma. Uma proposta aparece como proposta, sempre explicada, e não muda
   nada até alguém aceitar.

## Sete blocos de construção

Tudo no produto é feito só destes sete. Todo o resto (orientador, coorte,
colaborador, linhagem, "estiveram juntos") é **calculado**, nunca guardado.

| Bloco | O que é |
|---|---|
| Pessoa | Um ser humano que participou da produção de conhecimento. Tem página, com ou sem conta. |
| Instituição | Universidade, instituto, museu, estação, órgão, empresa. Tem história e muda de nome. |
| Programa | Curso, departamento, programa de pós, laboratório — o que o estudante escolhe e a instituição paga para manter correto. |
| Lugar | Onde o trabalho aconteceu de fato: campus, laboratório, sítio de campo, navio. |
| Período | Quando. Pode ser incerto: "1987", "c. 1987", "1985–1989", "antes de 1990", "até hoje" (9 tipos de data). |
| Contribuição | O que alguém fez: artigo, tese, conjunto de dados, temporada de campo, manter as parcelas, dar o curso — ~30 tipos. |
| Evidência | O documento ou fonte por trás de qualquer item acima. Toda ligação pode ser aberta até chegar nela. |

## As 11 telas

| # | Tela | Para quem | Existe hoje? |
|---|---|---|---|
| 01 | **Página da pessoa** — pública, permanente, com trajetória, linhagem, "documentado junto com", contribuições, lugares | todos | parcial — com login; faixa de resumo + trajetória compacta no topo (17 out) |
| 02 | **Reivindicar + revelação** — entrar, confirmar 3 coisas, ver na hora "você tem 23 descendentes acadêmicos" | quem se encontra | parcial (reivindicação com revisão) |
| 03 | **Linhagem** — árvore acadêmica, cada linha é uma tese | todos | parcial (linhagem de orientação) |
| 04 | **Uma ligação aberta** — as fontes que documentam a ligação + "esconder este vínculo da minha página" | todos | parcial (proveniência por item) |
| 05 | **Encontrar orientador** — mostra o que aconteceu com os ex-alunos, não citações; não é ranking | candidatos | não |
| 06 | **Explorar por lugar e tempo** — mapa + décadas, "em 1994, 37 pessoas estavam aqui" | todos | parcial (co-presença) |
| 07 | **Página de programa** — quem orienta, em quê, para onde foram os formados | candidatos; instituição paga | não |
| 08 | **Sugestões que mudariam o registro** — rotuladas, explicadas, inertes até confirmação | todos | não |
| 09 | **Console da instituição** — o que falta, o que precisa de revisão, relatórios, exportação total visível | instituição (o que se vende) | parcial (fila de revisão) |
| 10 | **Sua trajetória no tempo e no espaço** — CV como linha do tempo interativa + mapa; exporta CV | professores | **sim, sem mapa** — `/people/[id]/trajectory`: faixas por instituição + "parar num ano" (17 out) |
| 11 | **Colaboração** — pessoas que você deveria conhecer, parcerias, leituras; cada linha com o porquê | professores, pesquisadores | não |

Desenho completo das telas (wireframes): artifact "Nodes of Knowledge, Screen
by Screen" (15 set 2026).

### Dois tipos de sugestão

- **Sugestões que mudariam o registro** (tela 08): ficam paradas até uma
  pessoa confirmar. O que for recusado é lembrado e não volta.
- **Sugestões só para você** (tela 11): não escrevem nada no registro e não
  precisam de confirmação — mas continuam obrigadas a mostrar o motivo e a
  nunca ranquear pessoas. Podem ser desligadas, e qualquer pessoa pode se
  retirar da lista dos outros.

Ordem sempre: análise determinística primeiro → proposta rotulada depois →
confirmação humana por último.

## Por que o professor usa (em ordem de força)

1. Os alunos dele aparecem sob o nome dele.
2. O registro sobre ele está errado e ele não consegue deixar quieto — por isso
   a página precisa existir antes e estar ~90% certa, não em branco.
3. O CV se escreve sozinho.
4. Ser encontrado pelas pessoas certas.
5. Creditar as pessoas invisíveis (técnico, parataxonomista, assistente de campo).
6. Colaborações que ele não acharia sozinho.

Não funciona: barra de "perfil completo", pontuação, ranking, feed, primeira
sessão longa.

## Recusas permanentes

- Sem feed ranqueado.
- Sem métricas ou pontuação sobre pessoas; nada é ranqueado.
- Sem hospedar artigos.
- Sem vender destaque, posição ou contatos ("leads") — a instituição paga para
  manter o registro **correto**, nunca para aparecer **mais alto**.
- Sem ligação sem evidência.
- Sem prender a instituição: exportação total sempre disponível, na tela.

## Para quem vendemos primeiro

Alvo atual (decisão de 15 set 2026): **universidades de pesquisa dos EUA e
Canadá** — registro de trajetória de doutores e pós-docs ("para onde foram"),
todas as áreas. O painel do steward (tela 09) é o produto pago. A confirmar
pelo fundador antes da etapa 5 do `ROTEIRO.md`.

## Teste para qualquer ideia nova

Ela torna o registro **mais documentado**, **mais completo** ou **mais
legível**? Se não, vai para a lista "depois" do `ROTEIRO.md`.

## Dados de demonstração

Os dados de hoje são fictícios e servem só para testar a plataforma. Devem
estar sempre marcados como demonstração, e precisa existir um caminho limpo
para apagar tudo antes de entrar dado real.
