# Workflow — Reels @w.tec_digital

Pipeline completo para gerar reels de tecnologia, FOSS-only, orquestrado por agente via CLI.

## Visão Geral

```
Roteiro (JSON) → Hook (VHS) → Explicação (Manim) → Dado (Matplotlib) → CTA (Manim) → Composição + Áudio (FFmpeg) → Upload (API Meta)
```

## Stack de Reels (testada e aprovada)

Validada no teste `content/reels/ads/teste-pipeline/` (14s, 1080x1920, com música e SFX).

| Camada | Ferramenta | Papel | Instalação |
|---|---|---|---|
| Hook | **VHS** (charmbracelet) | Terminal que digita e executa comandos reais → mp4 | binário em `/usr/local/bin/vhs` + `ttyd` |
| Explicação | **Manim Community** | Cenas animadas: caixas, ícones (SVG Lucide), t2c (cor por palavra) | `.venv-manim/bin/manim` (pip) |
| Dados | **Matplotlib** `FuncAnimation` | Gráficos/barras animadas com contador | no mesmo venv |
| CTA | **Manim** | Logo + botão WhatsApp pulsando | idem |
| Ícones | **Lucide** (ISC) + **Simple Icons** (CC0, WhatsApp etc.) | SVGs baixados do GitHub raw | `curl` direto |
| SFX | **Kenney Interface Sounds** (CC0, 100 sons WAV) | teclas, pops, alerts, dings | repo `Calinou/kenney-interface-sounds` |
| Música | **OpenGameArt CC0** | trilha (ex: "acid-detective", 320kbps) | `curl` direto |
| Composição | **FFmpeg** | xfade entre camadas + mixagem trilha/SFX por timestamp | sistema |

**Princípios:**
- 100% FOSS/CC0 (sem APIs externas, sem atribuição obrigatória)
- Sem IA generativa local (Wan/CogVideoX descartados — GPU 4GB insuficiente)
- Controle total via CLI, orquestrado pelo agente

### Layout das cenas Manim (vertical 9:16)

`manim.cfg` na pasta do projeto:
```ini
[CLI]
pixel_width = 1080
pixel_height = 1920
frame_width = 4.5
frame_height = 8.0
fps = 30
disable_caching = True
```
- Texto sempre com `font="DejaVu Sans"` e guard `if mobj.width > 4.2: mobj.scale_to_fit_width(4.2)`
- Destaques de cor por palavra: `t2c={"sintoma": "#0578F5", "gratuito": "#3FB950"}`
- Fundo padrão: `#0d1117` (consistente com hook/plot)

### Hook VHS (tape)

- `Set Width/Height` em pixels; `Set TypingSpeed` controla a digitação
- Não usar comandos que não existem — criar script fake (ex.: `wtec`) antes e chamar `./wtec ...` (o VHS executa de verdade!)
- Cores no output: ANSI no script (`\e[96m`, `\e[1;91m`) renderizadas pelo tema
- Fonte: `DejaVu Sans Mono` (sem depender de Nerd Font)

### Composição e áudio (`compose_final.py`)

- Vídeo: `xfade=fade` entre os 4 segmentos, offsets calculados pelas durações reais
- Áudio: trilha CC0 a `volume=0.13` + SFX Kenney com `adelay` por timestamp + whoosh sintético (`anoisesrc` pink + bandpass) nas transições
- `amix normalize=0` → AAC 160k → mux com `-c:v copy`

### Rodar o pipeline

```bash
cd content/reels/ads/teste-pipeline
vhs hook.tape                                            # hook
ffmpeg -i hook.mp4 -vf "fps=30,pad=1080:1920:0:335:#0d1117" hook-fast.mp4
manim viloes.py Viloes -o viloes.mp4                     # explicação
python boot.py                                           # dado
manim cta_dark.py CTA -o cta.mp4                         # CTA
python compose_final.py                                  # monta tudo + áudio
```

### Etapas

### 1. Roteiro (`content/posts/<slug>.json`)

JSON estruturado com:
- `slug`: identificador único
- `type`: "carousel" ou "reel"
- `status`: "draft", "published", "scheduled"
- `caption`: legenda completa (até 2200 chars)
- `slides`: array com:
  - `index`: ordem
  - `kind`: "cover", "content", "data", "cta"
  - `eyebrow`: label no topo (badge)
  - `heading`: título principal
  - `body`: texto de apoio
  - `voiceover`: narração por slide
  - `visual_description`: descrição visual (opcional)
- `sources`: lista de fontes citadas

Exemplo: `content/posts/ssd-vs-hdd.json`

### 2. Export (`content/reels/`)

- Formato: MP4 (H.264), CRF 19, preset slow
- Resolução: 1080x1920 (9:16) ou 1080x1350 (4:5 feed ads)
- FPS: 30
- Áudio: AAC 44100Hz (trilha -18dB sob SFX)

### 3. Upload (`ig publish`)

Via API da Meta:
```bash
node dist/cli.js publish <slug> --via meta
```

Ou Zernio (sem app Meta):
```bash
node dist/cli.js publish <slug> --via zernio
```

## Acervos FOSS (usados de fato)

| Tipo | Fonte | Licença | URL |
|---|---|---|---|
| SFX UI | Kenney Interface Sounds (100 WAV) | CC0 | github.com/Calinou/kenney-interface-sounds |
| Ícones UI | Lucide (SVG raw) | ISC | github.com/lucide-icons/lucide |
| Ícones de marca | Simple Icons (WhatsApp etc.) | CC0 | github.com/simple-icons/simple-icons |
| Música | OpenGameArt tracks | CC0 | opengameart.org/content/acid-detective |
| Logo | `logo_wtec.jpg` na raiz → PNG transparente via `magick -fuzz 10% -transparent white` | própria | repo |

Veja **[ASSETS.md](./ASSETS.md)** para a lista completa de acervos.

## Fluxo Diário

```bash
# 1. Criar roteiro JSON em content/posts/<slug>.json
# 2. Gerar cenas (hook.tape, viloes.py, boot.py, cta_dark.py) com o novo conteúdo
# 3. Render e compor (comandos da seção "Rodar o pipeline")
# 4. Validar e publicar
node dist/cli.js validate <slug>
node dist/cli.js publish <slug>
```

## Limites da API

- Imagem: JPEG, 4:5 a 1.91:1, até 8 MB
- Legenda: 2200 chars, até 30 hashtags
- Container expira em 24h
- Cota: 50 publicações/24h

## Problemas Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| VHS `recording failed: Unknown setting` | v0.10 não tem `Setup`/`Set SetupCommand` | criar script antes; `Hide` só esconde output, não input |
| Manim texto estoura a largura | font_size alto no frame 4.5 | guard `scale_to_fit_width(4.2)` |
| `t2c` não colore | substring não existe exatamente no texto | conferir maiúsculas/acentos |
| OGA/Kenney 404 no download | URL via JS | usar espelho GitHub (Calinou) / path `/sites/default/files/` |
| Wikimedia/Incompetech 403 | bloqueio de User-Agent | `curl -A "Mozilla/5.0"` (incompetech devolve HTML mesmo assim — usar OGA) |
| `A Meta nao conseguiu baixar a midia` | repo privado, 404 | repo publico ou `IG_MEDIA_BASE_URL` |
| `Token invalido (code 190)` | token expirado | `ig auth refresh --write` |

## Próximos Passos

- [ ] Generalizar `compose_final.py` para ler roteiro JSON (tempo: quando haver 3+ reels)
- [ ] Biblioteca própria de trilhas/SFX em `content/assets/audio/`
- [ ] Narração opcional com Piper TTS PT-BR (voz Dii)
- [ ] Versão 4:5 (1080x1350) pra feed ads
- [ ] Documentar brand guidelines
