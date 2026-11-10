---
name: wtec-visual
description: Identidade visual e componentes W-Tec (@w.tec_digital) para reels e carrosséis — paleta, tipografia, formatos 9:16 e 4:5 e receitas testadas VHS/Manim/Matplotlib/FFmpeg. Use ao criar qualquer conteúdo visual do W-Tec (reels, carrossel, thumbnail, CTA, capas).
---

# W-Tec Visual

Sistema visual do @w.tec_digital. Referência viva do pipeline: `content/reels/ads/teste-pipeline/` e `WORKFLOW.md`.

## Dois modos

| Modo | Uso | Fundo | Texto |
|---|---|---|---|
| **Dark** | Reels, vídeos, cenas animadas | `#0d1117` | `#e6edf3` |
| **Light** | Carrossel de feed, capas de post | branco | `#1A2332` |

## Paleta

| Cor | Hex | Papel |
|---|---|---|
| Azul W-Tec | `#0578F5` | Marca: botões, barra de dado, palavra-chave destacada |
| Verde sucesso | `#3FB950` | Resultado positivo ("gratuito", contador bom) |
| Verde WhatsApp | `#25D366` | Só no botão de contato |
| Vermelho alerta | `#FF5555` | Problemas, dor, "!!" |
| Cinza muted | `#8b949e` | Subtítulos, handle, anotações |
| Âmbar / amarelo / rosa | `#FFB86C` `#FFD866` `#FF79C6` | Itens de lista coloridos (um por box) |

Regra: **uma palavra-chave colorida por cena**. Cor é ênfase, não decoração.

## Tipografia

- `DejaVu Sans` — títulos bold 34-40 (Manim frame 4.5x8), corpo 19-23
- `DejaVu Sans Mono` — só no hook de terminal
- Guard obrigatório no Manim: `if mobj.width > 4.2: mobj.scale_to_fit_width(4.2)`
- Destaque por palavra: `Text(..., t2c={"palavra": "#0578F5"})` — substring deve bater exato (acento/caixa)

## Formatos

- Reels/Stories: **1080x1920** (9:16) — `manim.cfg` com `frame_width=4.5, frame_height=8.0, fps=30`
- Feed/Ads/Carrossel: **1080x1350** (4:5)
- Motion loop de carrossel: MP4 2-4s, primeiro frame funciona como still

## Componentes prontos (receitas testadas)

### 1. Hook de terminal (VHS)
Tape: tema `"Dracula"`, `FontSize 30`, `1080x1250`, `Padding 70`, `TypingSpeed 55ms`. Script fake executável no diretório (VHS executa de verdade — nada de comando inexistente). Cores por ANSI: `->` ciano `\e[96m`, labels bold branco, alerta `!!` vermelho bold `\e[1;91m`. No FFmpeg: `pad=1080:1920:0:335:#0d1117`.

### 2. Boxes com ícone (Manim)
`RoundedRectangle(3.4 x 1.05, corner_radius=0.18, stroke_width=3.5)` colorido + ícone Lucide `scale_to_fit_height(0.5)` na mesma cor + label bold 23. Entrada: `LaggedStart(FadeIn(shift=RIGHT*0.6), lag_ratio=0.3)`.

### 3. Dado animado (Matplotlib)
Fundo `#0d1117`, barra `#0578F5` sobre track `#21262d`, contador grande que **fica verde `#3FB950` quando o número fica bom**. Easing `1-(1-t)^3`. Nota "exemplo ilustrativo" quando não houver fonte citada.

### 4. CTA (Manim)
`logo_wtec.png` (transparente) topo `scale_to_fit_height(1.15)` → título bold com uma palavra `t2c` azul → sub cinza com um destaque verde → botão `RoundedRectangle` `#25D366` (corner 0.3) com ícone `whatsapp.svg` (Simple Icons) + "Fale comigo" bold → pulso `scale(1.08)` → `@w.tec_digital` cinza embaixo.

### 5. Carrossel feed (modo light)
Branco; eyebrow azul em caixa alta com tracking; título preto bold grande (3 linhas máx); linha azul curta de 2px; subtítulo cinza; colchetes azuis nos 4 cantos; footer `@w.tec_digital` + `01/06`. Fonte do repo: `content/posts/assets/`.

## Ícones

- UI/tech: **Lucide** — `raw.githubusercontent.com/lucide-icons/lucide/main/icons/<nome>.svg`
- Marcas (WhatsApp etc.): **Simple Icons** — `raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/<nome>.svg`
- Manim: `SVGMobject(svg)` + `set_color` — Lucide (stroke) e Simple Icons (fill) funcionam dos dois jeitos

## Áudio

- Trilha CC0 (OpenGameArt) a `volume=0.13` com fade out 1.3s
- SFX Kenney CC0 (`Calinou/kenney-interface-sounds`): `tick/click` = teclas, `select` = linhas de output, `glass` = itens surgindo, `error` = alerta, `click + confirmation` = botão CTA
- Whoosh de transição: `anoisesrc=pink` + lowpass 1000 + highpass 250 + fades (0.35s)
- Mix: `amix normalize=0` por timestamps `adelay` — ver `compose_final.py`

## Regras de conteúdo

- Hook na primeira linha (125 chars) — é o que aparece antes do "mais"
- Número específico vence adjetivo ("47 apps" > "muitos apps")
- Uma ideia por cena/slide; cada slide legível isolado como screenshot
- CTA sempre com próximo passo concreto ("me manda o modelo", nunca "entre em contato")

## Armadilhas conhecidas

- VHS v0.10: sem `Setup`; `Hide` esconde só output, não input
- GitHub raw serve mp4 como `octet-stream` — Meta exige `video/mp4`: usar jsDelivr (`cdn.jsdelivr.net/gh/owner/repo@main/...`)
- Manim ignora `fps` do `[CLI]` às vezes — conferir com `ffprobe`
- Text sem guard estoura o frame 4.5 de largura

## Fontes de asset

Tudo CC0/MIT/ISC — lista com URLs em `WORKFLOW.md` (seção Acervos).
