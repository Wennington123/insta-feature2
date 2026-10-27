# W-Tec · agente de Instagram

Agente que **cria o conteudo** da conta `@w_tec` e CLI que **valida, pre-visualiza e publica** via API oficial da Meta. Funciona igual em Windows e Linux; conteudo e historico sincronizam pelo GitHub, segredos ficam so na maquina.

> Repositorio: https://github.com/Wennington123/insta-feature2
> Continuando em outro notebook? Siga o [CONTINUAR.md](./CONTINUAR.md).

```
conteudo (JSON) → render (JPEG) → validate → preview → publish → API da Meta
```

## Requisitos

- Node.js 20.6+ (`node -v`)
- Conta do Instagram **Business ou Creator** (a sua ja e)
- App na Meta for Developers com o produto **Instagram** e login do tipo **Instagram Login**
- Repositorio publico no GitHub **ou** um host publico de midia (Cloudflare R2, S3, CDN)

## 1. Configurar a Meta (uma vez)

1. Em [developers.facebook.com](https://developers.facebook.com/apps), crie um app do tipo **Business**.
2. Adicione o produto **Instagram** → **API setup with Instagram login**.
3. Conecte a conta `@w_tec` como testadora/administradora do app.
4. Gere um **access token** com as permissoes:
   - `instagram_business_basic`
   - `instagram_business_content_publish`
   - opcionais: `instagram_business_manage_insights`, `instagram_business_manage_comments`
5. Gere um **token de longa duracao** (60 dias).
6. Descubra o `IG_USER_ID`:

```bash
ig auth set <user_id> <token>     # pode gravar depois de descobrir
ig auth check --write             # mostra a conta e grava o IG_USER_ID
```

> O `user_id` retornado por `/me?fields=user_id,username` e o mesmo usado em `/<IG_ID>/media`.

### Alternativa: publicar via Zernio (sem app Meta)

Se voce nao quiser criar app, pedir Advanced Access ou lidar com token da Meta, o Zernio publica com o app aprovado dele. O @w_tec precisa ser Business/Creator; nao precisa de Pagina do Facebook.

1. Crie a conta em [zernio.com](https://zernio.com) e uma chave em [API keys](https://zernio.com/dashboard/api-keys).
2. No `.env`: `ZERNIO_API_KEY=sk_...` (e, se quiser, `PUBLISH_PROVIDER=zernio`).
3. Rode `node dist/cli.js zernio connect --write`. Ele cria o perfil, abre o OAuth do Instagram e grava `ZERNIO_ACCOUNT_ID`.
4. Confira com `node dist/cli.js zernio accounts`.
5. Publique com `node dist/cli.js publish <slug> --via zernio` (ou `ig zernio publish <slug>`).

`--dry-run` mostra o payload sem chamar a API e `--no-publish` cria um rascunho no Zernio. `ig zernio due` publica os agendados pelo Zernio. O plano gratuito cobre 2 contas com posts ilimitados.

## 2. Instalar

```bash
npm install
npm run build
npm link            # opcional: deixa o comando `ig` disponivel
```

Sem `npm link`, use `node dist/cli.js <comando>`.

## 3. Configurar o ambiente

```bash
ig init
```

Cria `.env` (a partir de `.env.example`), pastas de conteudo e valida o basico. Edite:

```ini
IG_USER_ID=1784...
IG_ACCESS_TOKEN=IGAA...
IG_MEDIA_BASE_URL=          # opcional, tem prioridade sobre GitHub raw
IG_API_VERSION=v26.0
IG_MACHINE=pc-casa          # opcional, aparece no published.jsonl
```

`.env` esta no `.gitignore` e **nunca** deve ser commitado.

## 4. Uso

```bash
ig doctor                       # diagnostico completo
ig status --all                 # posts e cota
ig render <slug>                # gera os JPEGs e atualiza media[]
ig validate <slug>              # regras da API + URLs publicas
ig preview <slug>               # abre o preview HTML
ig publish <slug>               # pede confirmacao digitando o slug
ig publish <slug> --dry-run     # mostra os requests, nao chama a API
ig publish <slug> --no-publish  # cria container e valida credenciais sem postar
ig limit                        # cota das ultimas 24h
```

O `publish` executa: validacao → checagem de midia → `POST /media` → poll `status_code` → `POST /media_publish` → registra em `content/published.jsonl` e marca o post como `published`.

## 5. Skill do agente

```bash
ig skill install
```

Copia `skills/instagram-agent/` para `~/.commandcode/skills/` (e `~/.claude/skills/` se existir). Depois e so pedir: _"faz um carrossel sobre X"_. A skill obriga: ler `brand.md`, gerar JSON, renderizar, validar, mostrar no chat e **esperar aprovacao** antes de publicar.

## 6. Agendamento

`content/posts/*.json` com `"status": "scheduled"` e `"scheduled_for": "2026-10-28T18:00:00-03:00"` (sempre com fuso).

```bash
ig due --dry-run        # confere o que sairia agora
ig due                  # publica o que venceu
ig due --sync           # git pull antes; commit/push do estado depois
```

**Windows** (Agendador de Tarefas, a cada 15 min):

```powershell
schtasks /Create /SC MINUTE /MO 15 /TN "IgDue" /TR "node C:\caminho\insta_feature2\dist\cli.js due --sync"
```

**Linux** (cron):

```cron
*/15 * * * * cd ~/insta_feature2 && node dist/cli.js due --sync >> ~/.local/state/ig.log 2>&1
```

Ou systemd user timer apontando para o mesmo comando. Rode o agendador em **um PC por vez** e use `--sync` para nao republicar o que a outra maquina ja postou.

## 7. Dois PCs e GitHub

| Versionado | Local (nunca commitado) |
|---|---|
| `brand.md` | `.env` (token) |
| `content/posts/*.json` | `node_modules/` |
| `content/assets/**/*.jpg` | `out/` (previews) |
| `content/published.jsonl` | |
| `skills/` | |

`published.jsonl` e append-only: uma linha por publicacao, praticamente sem conflito de merge.

### Midia publica

A Meta baixa a imagem por URL no momento do post. Duas opcoes:

1. **Repo publico**: `ig render` monta `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/...` automaticamente. Faca commit/push dos JPEGs antes de publicar.
2. **CDN**: defina `IG_MEDIA_BASE_URL=https://cdn.suaempresa.com/wtec` e publique os arquivos no mesmo caminho relativo.

`ig validate` e `ig doctor` conferem status HTTP, `Content-Type` e tamanho antes de gastar container.

## 8. Estrutura

```
src/
  cli.ts                 comandos e ajuda
  config.ts              .env + config do usuario
  graph/                 cliente da API, containers, token, cota
  content/               schema, regras, leitura/escrita, selectDue
  media/                 render SVG→JPEG, checagem de URL, GitHub raw
  core/publish.ts        fluxo unico de publicacao
  commands/              um arquivo por comando
content/
  posts/<slug>.json      fonte da verdade
  assets/<slug>/*.jpg    slides renderizados
  published.jsonl        historico
skills/instagram-agent/  skill do agente
```

## 9. Limites da API (o CLI valida antes)

- Imagem: **somente JPEG**, proporcao 4:5 a 1.91:1, ate 8 MB.
- Carrossel: 2 a 20 itens.
- Legenda: 2200 caracteres, ate 30 hashtags.
- Container expira em 24h.
- Cota: 50 publicacoes por 24h (o `ig limit` le o valor real da conta).
- Reels/Stories: video MP4/MOV; Stories nao aceitam legenda via API.

## 10. Problemas comuns

| Erro | Causa | Solucao |
|---|---|---|
| `A Meta nao conseguiu baixar a midia` | repo privado, 404 ou pagina HTML | repo publico ou `IG_MEDIA_BASE_URL` |
| `Content-Type image/png` | formato invalido | `ig render` ou converter para JPEG |
| `Token invalido (code 190)` | token expirado | `ig auth refresh --write` |
| `Cota esgotada` | 50 posts/24h | `ig limit`, reagende |
| `slug ja foi publicado` | idempotencia | outro slug ou `--force` |
| Render com fonte estranha no Linux | `Arial` ausente | troque `font` em `brand.md` |

## Seguranca

- Nenhum token e impresso por inteiro (`IGAA***abcd`).
- `.env`, `out/` e `dist/` sao ignorados pelo Git.
- Publicacao exige digitacao do slug ou `--yes` explicito.
- Nada de scraping ou automacao de navegador: apenas endpoints oficiais.
