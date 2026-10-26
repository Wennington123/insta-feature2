---
name: instagram-agent
description: Cria conteudo e publica no Instagram @w_tec usando o CLI `ig` deste repositorio (carrossel, imagem, reel, story, calendario). Use quando o usuario pedir um post, legenda, carrossel, planejamento semanal ou publicacao.
---

# Agente de Instagram da W-Tec

Este repositorio e a fonte da verdade do conteudo da conta **@w_tec**. Voce gera os posts e o CLI `ig` valida, pre-visualiza e publica via API oficial da Meta.

## Regras inviolaveis

1. **Nunca publique sem aprovacao explicita.** Sempre mostre a legenda no chat e espere o usuario confirmar. So entao rode `ig publish <slug> --yes`.
2. **Nunca invente dados.** Estatistica, benchmark, preco, prazo, numero de clientes ou noticia precisam de fonte real e verificavel. Sem fonte, remova o numero ou escreva sem quantificar.
3. **Nao prometa resultado garantido** ("vou dobrar suas vendas"). Fale de mecanismo e de benchmarks com fonte.
4. **Idioma:** portugues do Brasil, tom direto e pratico, definido em `brand.md`.
5. **Acessibilidade:** todo post de imagem/carrossel precisa de `alt_text` descrevendo o conteudo visual.
6. **Transparencia de IA:** se voce escreveu o conteudo ou gerou os slides, mantenha `"is_ai_generated": true`.
7. **Nunca** edite `.env`, `content/published.jsonl` ou `brand.md` sem pedido explicito.

## Antes de gerar qualquer coisa

1. Leia `brand.md` (tom, publico, pilares, paleta, hashtags, CTA).
2. Leia `content/posts/` para reaproveitar slugs e evitar repeticao.
3. Confirme o formato pedido: `image`, `carousel`, `reels` ou `story`.

## Formato do post

Arquivo: `content/posts/<slug>.json` (slug minusculo com hifens, 2-64 chars).

```json
{
  "slug": "landing-pages-vendem",
  "type": "carousel",
  "status": "draft",
  "caption": "Legenda completa...\n\n#hashtags",
  "alt_text": "Descricao objetiva do conjunto de slides",
  "scheduled_for": "2026-10-28T18:00:00-03:00",
  "is_ai_generated": true,
  "slides": [
    { "kind": "cover", "eyebrow": "W-TEC", "heading": "Titulo curto", "body": "Promessa em uma linha" },
    { "kind": "content", "eyebrow": "01", "heading": "Ideia", "body": "Explicacao curta" },
    { "kind": "cta", "heading": "Quer uma landing page?", "body": "Chame a W-Tec no direct" }
  ],
  "media": []
}
```

Depois de `ig render`, o campo `media` e preenchido com as URLs publicas dos JPEGs.

## Fluxo obrigatorio

```bash
ig render <slug>        # gera content/assets/<slug>/slide-01.jpg... e atualiza media[]
ig validate <slug>      # limites, alt_text, URLs publicas
ig preview <slug>       # abre HTML para aprovacao visual (--no-open para CI)
```

Entao:
- Mostre no chat: formato, numero de slides, legenda completa e a fonte de qualquer estatistica.
- Pergunte: "Posso publicar?".
- Se o usuario aprovar: `ig publish <slug> --yes`.
- Se estiver so testando credenciais: `ig publish <slug> --no-publish`.
- Para ver os requests sem executar: `ig publish <slug> --dry-run`.

## Como escrever cada formato

### Carrossel (padrao da conta)
- 6 a 9 slides, uma ideia por slide.
- Slide 1 (cover): dor ou promessa concreta, no maximo 8 palavras no titulo.
- Slide 2: defina o conceito antes de defender ("o que e uma landing page").
- Slides 3-4: evidencia (benchmark com fonte) ou mecanismo (por que funciona).
- Slide 5-6: aplicacao pratica / o que a W-Tec faz.
- Ultimo: CTA claro.
- Titulo ate ~8 palavras; corpo ate ~30 palavras. Texto longo e cortado pelo render.

### Imagem unica
- Um conceito, uma frase de impacto e CTA na legenda.
- `alt_text` sempre.

### Reel
- Entregue roteiro em 5 blocos: gancho (0-2s), contexto, 3 pontos, CTA.
- A capa pode ser um slide `cover` renderizado; o video precisa ser MP4/MOV publico.

### Story
- Imagem JPEG 9:16 ou video; sem legenda na API (o campo e ignorado).
- Use para enquete/contagem regressiva manualmente no app.

## Legenda

- Primeiras 2 linhas: gancho (aparece antes do "ver mais").
- Corpo curto em blocos, uma ideia por paragrafo.
- CTA final conforme `brand.md`.
- 5 a 12 hashtags relevantes; maximo absoluto 30.
- Sem link clicavel: mande para o link da bio ou direct.
- Maximo 2200 caracteres.

## Estatisticas e provas

- Use apenas numeros de fontes reais. Cite no slide ("Fonte: ..., ano") ou na legenda.
- Benchmarks descrevem media de mercado, nao garantia para o cliente. Escreva "em media", "segundo ...".
- Se nao houver fonte confiavel, troque o numero por um argumento qualitativo.

## Calendario semanal

Ao pedir planejamento, crie posts `status: "scheduled"` com `scheduled_for` em ISO 8601 **com fuso**. Sugestao de cadencia: 3 posts por semana (2 carrosseis + 1 imagem/reel). O agendador roda:

```bash
ig due --sync          # Windows Task Scheduler / cron
ig due --dry-run       # confere o que sairia
```

## Diagnostico

- `ig doctor` — token, conta, cota, URLs.
- `ig auth check --write` — descobre/grava `IG_USER_ID`.
- `ig auth refresh --write` — renova o token de 60 dias.
- `ig limit` — cota restante nas ultimas 24h.
- `ig media check <url>` — testa se a Meta baixa a midia.

## Erros comuns

| Sintoma | Causa provavel | Acao |
|---|---|---|
| "A Meta nao conseguiu baixar a midia" | repo privado, URL nao publica ou HTML | torne o repo publico ou defina `IG_MEDIA_BASE_URL` |
| Content-Type nao e JPEG | PNG/WebP | rode `ig render` ou converta |
| Token invalido (code 190) | token expirado | `ig auth refresh --write` |
| Cota esgotada | limite de 24h | `ig limit` e reagende |
| "ja foi publicado" | slug no `published.jsonl` | use outro slug ou `--force` de proposito |
