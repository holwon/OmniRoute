# CLI-INTEGRATIONS (Türkçe)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI Entegrasyonları — herhangi bir kodlama CLI'sını OmniRoute'a yönlendirin"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Entegrasyonları

OmniRoute, bir kodlama CLI'sını (Codex, Claude Code, OpenCode, Cline, …) OmniRoute'u arka uç olarak kullanacak şekilde yapılandıran bir dizi `setup-*` komutu ile birlikte gelir — böylece araç **bir** uç noktaya bağlanır ve OmniRoute doğru sağlayıcıya otomatik olarak yönlendirir. Her komut, çalışan bir OmniRoute'tan (yerel veya uzaktan) **canlı** model kataloğunu okur ve aracın kendi yapılandırma dosyasını **sizin** makinenizde yazar. API anahtarı, aracın desteklediği her yerde bir ortam değişkeni ile referans alınır. Araç yerel bir ortam dosyasını kalıcı hale getiren komutlar aşağıda belirtilmiştir.

Ayrıca, herhangi bir yapılandırma yazmadan doğru ortamı enjekte eden `omniroute run <target>` adlı genel bir başlatıcı da vardır; bu, `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` veya `gemini`'yi başlatır. Hedefler ve takma adları, kanonik manifestodan `bin/cli/cli-manifest.mjs` gelir (`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`, `open-code`, `qwen-code`, `gemini-cli`), ve `omniroute completion` aynı manifestodan türetilmiş hedef kelimeleri sunar. Eski her araç için başlatıcılar — `omniroute launch` (Claude Code) ve `omniroute launch-codex` (Codex) — kullanılabilir durumda kalır.

Sağlayıcı kaydı, aynı yerel/uzaktan bağlamdan mevcuttur. Aşağıdaki API-first komutları, yönetim kimlik doğrulamasını sağlayıcı kimlik bilgilerinden ayrı tutar ve asla yapılandırılmış çıktıda bir kimlik bilgisi yazdırmaz:

```bash
omniroute providers add glm --credential-env GLM_API_KEY --name work
omniroute providers import ./providers.json --dry-run --json
omniroute providers auth openai
omniroute providers edit <connection-id> --default-model glm/glm-5.2
omniroute providers remove <connection-id> --yes
```

Betikler için `--credential-stdin` veya `--credential-env` tercih edilmelidir; `--credential` kontrollü yerel kullanım için saklanmıştır. `providers remove`, etkileşimli olmayan bir terminalde `--yes` gerektirir ve beş komut da aktif bağlamı veya global `--base-url`/`--api-key` seçeneklerini dikkate alır.

İki en zengin entegrasyonun bir kerelik, el yazısı ile yapılan temel kurulumu için, her araç için derinlemesine incelemelere bakın:

- [Claude Code yapılandırması](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI yapılandırması](./CODEX-CLI-CONFIGURATION.md)
- [Uzaktan Mod](./REMOTE-MODE.md) — dizüstü bilgisayarınızdan uzaktan bir OmniRoute'u yönetin (VPS / Tailnet)
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — OmniCopilot uzantısı; ayrıca bu `setup-*` komutlarını editör içinde sizin için çalıştırabilir

---

## Ana tablo

Her komut, **aktif bağlamı** ( `omniroute connect` ile ayarlanmış, bkz. [Uzaktan Mod](./REMOTE-MODE.md)) veya açık `--remote <url> --api-key <key>` bayraklarını dikkate alır. Aşağıdaki "Yerel vs uzaktan" ifadesi: bayraksız olarak `http://localhost:20128`'i hedef alır; `--remote` ile (veya aktif bir uzaktan bağlam ile) o sunucudan katalogu alır ve yapılandırmayı yerel olarak yazar.

| Komut                      | Araç                     | Yazdığı şey                                                                                                                                                | Ana bayraklar                                                                                                                              | Yerel vs uzaktan |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `omniroute setup-codex`    | OpenAI Codex CLI         | `~/.codex/<name>.config.toml` — uyumlu metin modeli başına bir profil (`codex --profile <name>`)                                                           | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Her ikisi        |
| `omniroute setup-claude`   | Claude Code              | `~/.claude/profiles/<name>/settings.json` — eşleşen model başına bir profil (`CLAUDE_CONFIG_DIR`)                                                          | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Her ikisi        |
| `omniroute setup-opencode` | OpenCode (openai-uyumlu) | `~/.config/opencode/opencode.json` — her katalog modeline sahip `omniroute` sağlayıcısı (`opencode -m omniroute/<model>`)                                  | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Her ikisi        |
| `omniroute setup-cline`    | Cline                    | `~/.cline/data/{globalState,secrets}.json` (CLI modu) + VS Code uzantı ayarlarını yazdırır                                                                 | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Her ikisi        |
| `omniroute setup-kilo`     | Kilo Code                | `~/.local/share/kilo/auth.json` (CLI) + mevcutsa `kilocode.*`'u VS Code `settings.json` içine birleştirir                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Her ikisi        |
| `omniroute setup-continue` | Continue / `cn` CLI      | `~/.continue/config.yaml` — `provider: openai` modelleri, anahtar `${{ secrets.OMNIROUTE_API_KEY }}` aracılığıyla                                          | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Her ikisi        |
| `omniroute setup-cursor`   | Cursor                   | Hiçbir şey — uygulama içindeki adımları yazdırır (Cursor yapılandırması opak SQLite)                                                                       | `--remote` `--api-key` `--only` `--port`                                                                                                   | Her ikisi        |
| `omniroute setup-roo`      | Roo Code                 | `~/.omniroute/roo-settings.json` (içe aktarma belgesi) + bir VS Code `settings.json` varsa `roo-cline.autoImportSettingsPath` ayarlar                      | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Her ikisi        |
| `omniroute setup-crush`    | Crush                    | `~/.config/crush/crush.json` — `openai-uyumlu` sağlayıcı, anahtar `$OMNIROUTE_API_KEY` aracılığıyla                                                        | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Her ikisi        |
| `omniroute setup-goose`    | Goose                    | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + ortam tarifini yazdırır                                                     | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Her ikisi        |
| `omniroute setup-aider`    | Aider                    | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + ortam tarifini yazdırır                                                                   | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Her ikisi        |
| `omniroute setup-qwen`     | Qwen Code                | `~/.qwen/settings.json` — V4 `modelProviders.openai` dizisi + `OMNIROUTE_API_KEY` `~/.qwen/.env` içinde                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Her ikisi        |
| `omniroute run <target>`   | Çalışma başlatma (genel) | Hiçbir şey — doğru ortam ve argümanlarla `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` başlatır; Qwen ve Gemini geçici izole bir ev kullanır | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Her ikisi        |
| `omniroute launch`         | Claude Code              | Hiçbir şey — `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` ile `claude` başlatır                                                                             | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Her ikisi        |
| `omniroute launch-codex`   | OpenAI Codex CLI         | Hiçbir şey — `-c` bayrakları aracılığıyla `omniroute` sağlayıcısı ile `codex` başlatır                                                                     | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Her ikisi        |

Bayraklar hakkında notlar (komut kaynağında doğrulanmıştır):

- `--remote <url>` — uzaktan bir OmniRoute'tan katalogu alır ( `--port` ve aktif bağlamı geçersiz kılar). `--api-key <key>` o sunucu için kimlik bilgilerini sağlar (varsayılan olarak `OMNIROUTE_API_KEY` ortam değişkenine veya aktif bağlamın jetonuna ayarlanır).
- `--only <patterns>` — virgülle ayrılmış alt dizeler; yalnızca eşleşen model kimliklerini tutar (örneğin, `--only glm,kimi`). `setup-codex`, `setup-claude`, `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush` üzerinde mevcuttur.
- `--dry-run` — dosya sistemine dokunmadan yazılacak olanı tam olarak yazdırır. Her `setup-*` komutunda mevcuttur **hariç** `setup-cursor` (asla bir dosya yazmaz).
- `--model <id>` — otomatik model keşfi olmayan araçlar için gereklidir (veya etkileşimli olarak seçilir): Cline, Kilo, Roo, Goose, Qwen, Aider. Bu araçlar ayrıca etkileşimli çalıştırmalar için `--yes`'i kabul eder (bu durumda `--model` gereklidir). `setup-opencode`, varsayılan üst düzey modeli ayarlamak için `--model` alır.
- `--model <id>` `omniroute run` üzerinde manifestonun her hedef için bağlantısını takip eder (`bin/cli/cli-manifest.mjs`): **aider** `--model openai/<id>` alır ve **opencode** `--model omniroute/<id>` (ön ek yalnızca id zaten taşımıyorsa eklenir); **qwen** ve **gemini** id'yi olduğu gibi alır; **claude** bunu `ANTHROPIC_MODEL` aracılığıyla alır, **goose** `GOOSE_MODEL` aracılığıyla ve **codex** `-c model_providers.omniroute.*` argümanları aracılığıyla alır. **Qwen, yalnızca `--model` gerektiren tek çalıştırma hedefidir** — `omniroute run qwen` olmadan çıkış kodu `2` ile açık bir hata verir.
- `--port <port>` — yerel OmniRoute portu (varsayılan `20128`, `--remote` ayarlandığında göz ardı edilir). Tüm `setup-*` ve her iki başlatıcıda mevcuttur.
- `omniroute run` çıkış kodları: çocuk CLI'nın kendi çıkış kodu olduğu gibi iletilir; `2` = geçersiz argümanlar (desteklenmeyen hedef, eksik gerekli `--model`, konteyner koruması); `127` = hedef ikili `PATH` içinde değil; `130`/`143`/`129` başlatma `SIGINT`/`SIGTERM`/`SIGHUP` ile sonlandığında; `1` = diğer çalışma zamanı başlatma hatası.
- İki başlatıcı (`launch`, `launch-codex`) `setup-claude` / `setup-codex` tarafından yazılan bir profili seçmek için `--profile <name>` alır, ayrıca temel `claude` / `codex` ikili için geçiş argümanları alır.

Etkileşimli seçim aracı, kurulum tarifleri ile de paylaşılmaktadır:

```bash
# Aktif yerel veya uzaktan model kataloğundan seçin ve hedefi yapılandırın.
omniroute configure claude
omniroute configure opencode --provider glm
omniroute configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` şu anda `codex`, `claude`, `opencode`, `qwen`, `aider`, `goose`, `cline`, `continue` ve `kilo` için test edilen tariflere devreder. Sadece IDE, MITM ve rehber olarak katalog girişleri açıkça `setup-*`/manuel akışlar olarak kalır ve başlatılabilir hedefler olarak sunulmaz.

> `setup-opencode`, **hafif openai-uyumlu** OpenCode entegrasyonudur.
> Ayrıca daha zengin bir eklenti entegrasyonu vardır — `omniroute setup opencode` — bu, `@omniroute/opencode-plugin`'i yükler. Bunlar farklı komutlardır; yukarıdaki tablo `setup-opencode`'yi belgeler.

---

## Yerel kullanım

`localhost:20128` üzerinde OmniRoute çalışırken, sadece aracınız için kurulum komutunu çalıştırın. Katalog yerel sunucudan alınır.

```bash
# Codex: eşleşen model başına ~/.codex/ içine bir profil yaz
omniroute setup-codex
codex --profile glm52            # oluşturulan profili kullan

# Claude Code: model başına profiller yaz, sonra birini başlat
omniroute setup-claude
omniroute launch --profile glm52

# OpenCode: tüm katalog modelleri ile openai uyumlu sağlayıcıyı yaz
omniroute setup-opencode
export OMNIROUTE_API_KEY=sk-...  # {env:OMNIROUTE_API_KEY} ile referans alınır, asla diskte değil
opencode -m omniroute/glm/glm-5.2 "..."

# Otomatik keşif yapmayan araçlar açık bir model gerektirir:
omniroute setup-aider --model glm/glm-5.2
omniroute setup-qwen --model qwen/qwen3.8-max-preview

# Hiçbir şey yazmadan önizleme:
omniroute setup-continue --dry-run
```

Hiçbir yapılandırma yazmadan başlatın (sadece ortam enjekte etme):

```bash
omniroute launch                 # Claude Code → yerel OmniRoute
omniroute launch-codex           # Codex CLI → yerel OmniRoute
omniroute launch-codex --profile glm52
omniroute run claude --model openai/gpt-5.4
omniroute run codex --model openai/gpt-5.4 --dry-run --json
omniroute run aider --model glm/glm-5.2 -- --message "reply OK"
omniroute run goose --model glm/glm-5.2
omniroute run opencode --model glm/glm-5.2 -- run "reply OK"
omniroute run qwen --model glm/glm-5.2 -- -p "reply OK"
omniroute run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Açık komut yolu: -- sonrası gelen her şeyi geçirin
omniroute run claude -- --print-system-prompt "bu farkı gözden geçir"
```

---

## Uzaktan kullanım

Herhangi bir kurulum komutunu `--remote` + `--api-key` ile uzaktaki bir OmniRoute'a yönlendirin. Katalog uzaktan alınır; yapılandırma yerel makinenizde yazılır.

```bash
# Uzaktaki bir VPS'ye karşı OpenCode, yalnızca glm/kimi modellerini tut
omniroute setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m omniroute/glm/glm-5.2 "..."   # önce OMNIROUTE_API_KEY'i dışa aktar

# Uzaktan bir katalogdan Codex profilleri
omniroute setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# CLI'yi doğrudan uzaktaki sunucuya karşı başlat
omniroute launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
omniroute launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

Her seferinde `--remote`/`--api-key` geçmek yerine, bir kez giriş yapın ve **aktif bağlam** bunları otomatik olarak sağlasın:

```bash
omniroute connect 192.168.0.15        # kapsamlı bir token oluşturur, bağlamı saklar
omniroute setup-codex                 # ← artık uzaktan katalogu kullanır
omniroute setup-opencode              # ← aynı
omniroute launch                      # ← Claude Code uzakta
```

Bağlamlar, kapsamlar ve token yönetimi için [Uzaktan Mod](./REMOTE-MODE.md) sayfasına bakın.

---

## Temel URL konvansiyonları (hangi araçlar `/v1` ister)

OmniRoute, OpenAI yüzeyini `/v1`'de, Anthropic yüzeyini kök dizinde ve yerel Gemini yüzeyini `/v1beta`'da sunar. Her entegrasyon, aracının beklediği forma bağlıdır (komut kaynağında doğrulanmıştır):

| Entegrasyon                                                                | Yazılan Temel URL | `/v1`?                                       |
| -------------------------------------------------------------------------- | ----------------- | -------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | kök               | Hayır — Cline `/v1/chat/completions` ekler   |
| `setup-goose` (`OPENAI_HOST`)                                              | kök               | Hayır — Goose yolu ekler                     |
| `setup-aider` (`OPENAI_API_BASE`)                                          | kök               | Hayır — LiteLLM `/v1/chat/completions` ekler |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | `/v1` ile         | Evet                                         |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | kök               | Hayır — Claude Code `/v1/messages` ekler     |
| `setup-codex`, `launch-codex` (`model_providers.omniroute.base_url`)       | `/v1` ile         | Evet                                         |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | `/v1` ile         | Evet                                         |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | kök               | Hayır — SDK `/v1beta/models/…` ekler         |

---

## Yerel bağımlılıkları güncellemede tutmak: `--include=optional`

`omniroute update` ile güncelleme yaptığınızda (onayladıktan sonra veya `--apply` ile),
OmniRoute, `--include=optional` seçeneği ile yüklemeyi gerçekleştirir:

```bash
npm install -g omniroute@latest --include=optional
```

Bu, `omniroute update` komutuna geçirdiğiniz bir bayrak **değildir** — her zaman
güncelleyici tarafından uygulanır. `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, LLMLingua SLM yığını) güncelleme sırasında hayatta kalmasını garanti eder,
npm yapılandırmanızda `omit=optional` ayarı olsa bile, bu durumda yerel SQLite
sürücüsü ve OS-anahtar bağıntısı sessizce kaldırılır. Uygulamadan önce tam komutu
önizlemek için:

```bash
omniroute update --dry-run
# [DRY RUN] Şu komut çalıştırılacak: npm install -g omniroute@latest --include=optional
```

Diğer `omniroute update` bayrakları (kaynakta doğrulanmıştır): `--check` (eskiyse 1 ile çık),
`--apply` (sormadan yükle), `--changelog`, `--no-backup`, `--yes`.

---

## Google Gemini CLI `omniroute run gemini` ile

`@google/gemini-cli` 0.50.0 ile doğrulanan sözleşme: CLI, `GOOGLE_GEMINI_BASE_URL`'yi
kabul eder ve `POST /v1beta/models/<model>:generateContent`
(ve `:streamGenerateContent?alt=sse`) talep eder — tam olarak OmniRoute'un yerel
Gemini yüzeyi (`/v1beta`). `omniroute run gemini` bunu otomatik olarak bağlar:

- `GOOGLE_GEMINI_BASE_URL` → aktif OmniRoute temel URL'si (kök, `/v1` yok);
- `GEMINI_API_KEY` → çözümlenen OmniRoute kimlik bilgisi (seçenek/env/bağlam);
- **geçici izole `GEMINI_CLI_HOME`** `.gemini/settings.json` dosyası
  `gemini-api-key` kimlik doğrulamasını seçer, böylece saklanan Google OAuth oturumu
  (Kod Yardımcı) asla OmniRoute yönlendirmeli başlatmayı geçersiz kılmaz — çıkıştan sonra
  kaldırılır;
- **env hijyeni**: çocuk ortamı `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` ve `GOOGLE_GENAI_USE_GCA`'dan arındırılır (bu
  kimlik doğrulamasını Vertex/Kod Yardımcıya yönlendirebilir), ve `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`
  bir yedek olarak ayarlanır — diğer `run` hedefleri kendi çelişen değişkenleri için
  aynı muameleyi alır;
- `--model <id>` enjeksiyonu `--provider`/`--model`'dan.

```bash
omniroute run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Gemini'nin çalışma alanı güvenlik koruması hala başsız modda geçerlidir — `--skip-trust`
geçirin (veya dizini etkileşimli olarak güvenilir hale getirin); başlatıcı bunu
kasıtlı olarak atlamaz. Bu başlatıcı, **ACP kaydı** (`src/lib/acp/registry.ts`, `gemini --acp`)
ile farklıdır, bu hala `/dashboard/acp-agents` için ajan-protokol entegrasyonudur.

---

## Gerçek duman taraması (isteğe bağlı)

Deterministik başlatma planı regresyon testleri CI'da (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). GERÇEK ikili dosyaları GERÇEK
OmniRoute sunucusuna karşı doğrulamak için, `tests/integration/upstream-cli-smoke.int.test.ts`
adresinde isteğe bağlı bir sistem bulunmaktadır. Bu otomatik olarak çalışmaz
(her alt test, `RUN_CLI_SMOKE=1` ayarı yapılmadıkça atlanır), kimlik bilgilerini
çevre değişkeni ADI ile iletir (değer ile değil), anahtar biçimindeki dizeleri
herhangi bir kaydedilmiş çıktıda sansürler, ikili dosyası yüklü olmayan hedefleri
atlar ve hataları kimlik doğrulama / yukarı akış / yapılandırma olarak sınıflandırır,
basit bir boolean yerine:

```bash
RUN_CLI_SMOKE=1 \
OMNIROUTE_SMOKE_BASE_URL="http://localhost:20128" \
OMNIROUTE_SMOKE_MODEL="<provider/model>" \
OMNIROUTE_SMOKE_API_KEY_ENV="OMNIROUTE_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

İsteğe bağlı: `OMNIROUTE_SMOKE_TARGETS="codex,opencode,qwen"` taramayı kısıtlar;
`OMNIROUTE_SMOKE_TIMEOUT_MS` her hedef için 120s zaman aşımını geçersiz kılar.

---

## Ayrıca bakınız

- [Claude Code yapılandırması](./CLAUDE-CODE-CONFIGURATION.md) — daha derin bir Claude Code kılavuzu
- [Codex CLI yapılandırması](./CODEX-CLI-CONFIGURATION.md) — bir kerelik `[model_providers.omniroute]` temel kurulumu
- [Uzaktan Mod](./REMOTE-MODE.md) — bağlamlar, kapsamlı erişim jetonları, uzaktan bir sunucuyu yönetme
- [CLI Araçları referansı](../reference/CLI-TOOLS.md) — desteklenen araçların tam kataloğu + kontrol paneli sayfaları
- [Kurulum Kılavuzu](./SETUP_GUIDE.md) — kurulum yöntemleri ve ilk çalışma eğitimi
