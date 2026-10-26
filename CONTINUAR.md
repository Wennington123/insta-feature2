# Continuar em outro notebook

Guia para retomar o projeto em outra maquina. O repositorio e **publico** porque a Meta precisa baixar as imagens por URL; o token **nao** fica no Git.

## 1. Clonar e instalar

```bash
git clone https://github.com/Wennington123/insta-feature2.git
cd insta-feature2
node --version          # precisa ser 20.6 ou superior
npm install
npm run build
```

Se nao tiver Node:

- Windows: `winget install OpenJS.NodeJS.LTS`
- Linux (Debian/Ubuntu): `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs`
- Ou use o Node portatil que ja existe neste notebook em `Desktop\cursos_pcf\.tooling\node-v24.21.0-win-x64`.

## 2. Credenciais (so nesta maquina)

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Preencha `IG_ACCESS_TOKEN` com o token da Meta:

1. `developers.facebook.com/apps` → app tipo **Business**
2. **Instagram → API setup with Instagram business login**
3. **Add account** → login `@w_tec` (conta profissional e publica)
4. **Generate token** → copiar (validade 60 dias)
5. Colar em `IG_ACCESS_TOKEN=` e salvar

O `IG_USER_ID` nao precisa ser preenchido na mao:

```bash
node dist/cli.js auth check --write
node dist/cli.js doctor
```

`auth check --write` descobre e grava o `IG_USER_ID`. `doctor` valida token, conta, cota e URLs de midia.

> Nunca commite `.env`. Ele ja esta no `.gitignore`. Quem tem o token publica e apaga posts.

## 3. Publicar o carrossel que ja existe

O post esta em `content/posts/landing-pages-vendem.json` e os JPEGs em `content/assets/landing-pages-vendem/`.

```bash
node dist/cli.js render landing-pages-vendem    # atualiza media[] com as URLs raw do GitHub
node dist/cli.js validate landing-pages-vendem  # limites + checagem das URLs
node dist/cli.js preview landing-pages-vendem   # abre o HTML de aprovacao
node dist/cli.js publish landing-pages-vendem --no-publish   # teste: cria container, nao posta
node dist/cli.js publish landing-pages-vendem                # publica de verdade
```

O ultimo pede que voce digite o slug para confirmar. Para automacao existe `--yes`.

Depois de renderizar, os JPEGs precisam estar commitados e no remoto para a URL raw funcionar:

```bash
git add content/assets content/posts
git commit -m "content: render landing-pages-vendem"
git push
```

## 4. Fluxo diario

```bash
git pull
# pedir ao agente: "faz um carrossel sobre X"
node dist/cli.js render <slug>
node dist/cli.js validate <slug>
node dist/cli.js preview <slug>
node dist/cli.js publish <slug>
git add content && git commit -m "content: <slug>" && git push
```

## 5. Skill do agente

```bash
node dist/cli.js skill install
```

Copia a skill para `~/.commandcode/skills/instagram-agent` (e para `~/.claude/skills` se existir). Reinicie a sessao do agente e peca o post normalmente.

## 6. Agendamento

Posts com `"status": "scheduled"` e `"scheduled_for"` em ISO 8601 com fuso.

**Windows** (Agendador de Tarefas, a cada 15 min):

```powershell
schtasks /Create /SC MINUTE /MO 15 /TN "IgDue" /TR "node C:\caminho\insta-feature2\dist\cli.js due --sync"
```

**Linux** (cron):

```cron
*/15 * * * * cd ~/insta-feature2 && node dist/cli.js due --sync >> ~/.local/state/ig.log 2>&1
```

Rode o agendador em **um** notebook por vez. `--sync` faz `git pull` antes e commit/push do `published.jsonl` depois, evitando publicar duas vezes o mesmo post.

## 7. Estado compartilhado

| Versionado | Local |
|---|---|
| `brand.md` | `.env` |
| `content/posts/*.json` | `node_modules/` |
| `content/assets/**/*.jpg` | `out/` |
| `content/published.jsonl` | `dist/` |
| `skills/` | |

`content/published.jsonl` e append-only: uma linha por publicacao. Se der conflito, mantenha as duas linhas.

## 8. Checklist rapido

- [ ] `node --version` >= 20.6
- [ ] `npm install && npm run build`
- [ ] `.env` com token
- [ ] `auth check --write` OK
- [ ] `doctor` sem erros
- [ ] `git pull` antes de publicar
- [ ] `publish --no-publish` antes do post real

## 9. Se algo falhar

| Erro | Causa | Acao |
|---|---|---|
| `A Meta nao conseguiu baixar a midia` | repo privado, 404 ou HTML | repo publico ou `IG_MEDIA_BASE_URL` |
| `Content-Type image/png` | formato invalido | `render` ou converter para JPEG |
| `Token invalido (code 190)` | expirou | gerar novo token no painel |
| `Cota esgotada` | 50 posts/24h | `limit`, reagendar |
| `slug ja foi publicado` | idempotencia | outro slug ou `--force` |
