# CLI-TOOLS (Türkçe)

🌐 **Languages:** 🇺🇸 [English](../../../../reference/CLI-TOOLS.md) · 🇸🇦 [ar](../../../ar/docs/reference/CLI-TOOLS.md) · 🇦🇿 [az](../../../az/docs/reference/CLI-TOOLS.md) · 🇧🇬 [bg](../../../bg/docs/reference/CLI-TOOLS.md) · 🇧🇩 [bn](../../../bn/docs/reference/CLI-TOOLS.md) · 🇨🇿 [cs](../../../cs/docs/reference/CLI-TOOLS.md) · 🇩🇰 [da](../../../da/docs/reference/CLI-TOOLS.md) · 🇩🇪 [de](../../../de/docs/reference/CLI-TOOLS.md) · 🇪🇸 [es](../../../es/docs/reference/CLI-TOOLS.md) · 🇮🇷 [fa](../../../fa/docs/reference/CLI-TOOLS.md) · 🇫🇮 [fi](../../../fi/docs/reference/CLI-TOOLS.md) · 🇫🇷 [fr](../../../fr/docs/reference/CLI-TOOLS.md) · 🇮🇳 [gu](../../../gu/docs/reference/CLI-TOOLS.md) · 🇮🇱 [he](../../../he/docs/reference/CLI-TOOLS.md) · 🇮🇳 [hi](../../../hi/docs/reference/CLI-TOOLS.md) · 🇭🇺 [hu](../../../hu/docs/reference/CLI-TOOLS.md) · 🇮🇩 [id](../../../id/docs/reference/CLI-TOOLS.md) · 🇮🇩 [in](../../../in/docs/reference/CLI-TOOLS.md) · 🇮🇹 [it](../../../it/docs/reference/CLI-TOOLS.md) · 🇯🇵 [ja](../../../ja/docs/reference/CLI-TOOLS.md) · 🇰🇷 [ko](../../../ko/docs/reference/CLI-TOOLS.md) · 🇮🇳 [mr](../../../mr/docs/reference/CLI-TOOLS.md) · 🇲🇾 [ms](../../../ms/docs/reference/CLI-TOOLS.md) · 🇳🇱 [nl](../../../nl/docs/reference/CLI-TOOLS.md) · 🇳🇴 [no](../../../no/docs/reference/CLI-TOOLS.md) · 🇵🇭 [phi](../../../phi/docs/reference/CLI-TOOLS.md) · 🇵🇱 [pl](../../../pl/docs/reference/CLI-TOOLS.md) · 🇵🇹 [pt](../../../pt/docs/reference/CLI-TOOLS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/reference/CLI-TOOLS.md) · 🇷🇴 [ro](../../../ro/docs/reference/CLI-TOOLS.md) · 🇷🇺 [ru](../../../ru/docs/reference/CLI-TOOLS.md) · 🇸🇰 [sk](../../../sk/docs/reference/CLI-TOOLS.md) · 🇸🇪 [sv](../../../sv/docs/reference/CLI-TOOLS.md) · 🇰🇪 [sw](../../../sw/docs/reference/CLI-TOOLS.md) · 🇮🇳 [ta](../../../ta/docs/reference/CLI-TOOLS.md) · 🇮🇳 [te](../../../te/docs/reference/CLI-TOOLS.md) · 🇹🇭 [th](../../../th/docs/reference/CLI-TOOLS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/reference/CLI-TOOLS.md) · 🇵🇰 [ur](../../../ur/docs/reference/CLI-TOOLS.md) · 🇻🇳 [vi](../../../vi/docs/reference/CLI-TOOLS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/reference/CLI-TOOLS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/reference/CLI-TOOLS.md)

---

---

title: "CLI Araçları — OmniRoute"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Araçları — OmniRoute

Son güncelleme: 2026-08-18

OmniRoute, üç özel kontrol paneli sayfasında dağıtılmış üç kategori CLI aracı ile entegre olur:

| Sayfa            | Rota                    | Kavram                                                                                | Sayı                  |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------- | --------------------- |
| **CLI Kodu**     | `/dashboard/cli-code`   | OmniRoute'a yönlendirdiğiniz kodlama araçları (Müşteri → CLI → OmniRoute → Sağlayıcı) | 26                    |
| **CLI Ajanları** | `/dashboard/cli-agents` | OmniRoute'a yönlendirdiğiniz otonom ajanlar (aynı akış, daha geniş kapsam)            | 8                     |
| **ACP Ajanları** | `/dashboard/acp-agents` | OmniRoute'un stdio/ACP aracılığıyla arka planda oluşturduğu CLIs (ters akış)          | kayıt defterine bakın |

Eski rotalar 308 ile yönlendirilir: `/dashboard/cli-tools` → `/dashboard/cli-code`, `/dashboard/agents` → `/dashboard/acp-agents`.

---

## Nasıl Çalışır

```
CLI Kodu / CLI Ajanları (tüketim akışı):
Claude / Codex / OpenCode / Cline / KiloCode / Continue / Hermes Ajanı / Goose / ...
           │
           ▼  (hepsi OmniRoute'a yönlendirir)
    http://YOUR_SERVER:20128/v1
           │
           ▼  (OmniRoute doğru sağlayıcıya yönlendirir)
    Anthropic / OpenAI / Gemini / DeepSeek / Groq / Mistral / ...

ACP Ajanları (ters oluşturma akışı):
    Müşteri isteği → OmniRoute → stdio/ACP aracılığıyla CLI oluşturur → yanıt
```

**Faydalar:**

- Tüm araçları yönetmek için tek bir API anahtarı
- Kontrol panelindeki tüm CLIs arasında maliyet takibi
- Her aracı yeniden yapılandırmadan model değiştirme
- Yerel ve uzaktan sunucularda (VPS, Docker, Akamai, Cloudflare Tüneli) çalışır

---

## `setup-*` ile Otomatik Yapılandırma

Her aracın yapılandırmasını elle yazmak zorunda değilsiniz. OmniRoute, çalışan bir
OmniRoute'tan (yerel veya uzaktan) **canlı** model kataloğunu okuyan ve aracın kendi
yapılandırmasını makinenize yazan her desteklenen CLI için bir `setup-*`
komutu gönderir:

```bash
omniroute setup-codex        omniroute setup-claude       omniroute setup-opencode
omniroute setup-cline        omniroute setup-kilo         omniroute setup-continue
omniroute setup-cursor       omniroute setup-roo          omniroute setup-crush
omniroute setup-goose        omniroute setup-qwen         omniroute setup-aider
```

Her biri `--remote <url> --api-key <key>` (uzaktaki bir OmniRoute'a karşı yerel bir aracı yapılandırma), `--dry-run` (yazmadan önizleme) ve `--port` alır. Model otomatik keşfi olmayan araçlar (Cline, Kilo, Roo, Goose, Aider, Qwen) `--model <id>` (ve etkileşimsiz çalıştırmalar için `--yes`) alır. Doğru ortamın enjekte edildiği ve hiç yapılandırma yazılmadan bir CLI başlatmak için, genel `omniroute run <target>` başlatıcısını kullanın (claude, codex, aider, goose, opencode, qwen, gemini — hedefler ve takma adlar `bin/cli/cli-manifest.mjs`'den gelir); eski her araç için başlatıcılar `omniroute launch` (Claude Kodu) ve `omniroute launch-codex` (Codex) kullanılmaya devam eder. Gemini CLI yalnızca başlatma içindir: bir `omniroute run` hedefidir ancak `setup-*`/`configure` tarifi yoktur.

> **Tam referans:** her komutun ne yazdığı, her bayrak, yerel ve uzaktan, ve hangi araçların `/v1` son ekine ihtiyaç duyduğuna dair ana tablo **[CLI Entegrasyonları](../guides/CLI-INTEGRATIONS.md)**'nda bulunmaktadır.

### Bir konteyner içinde bunları çalıştırma

OmniRoute konteyneri içinde yürütülen bir `setup-*` komutu, konteynerin kendi evine yazar, bu da hiçbir ana CLI tarafından okunmaz ve konteyner ile birlikte kaybolur. OmniRoute bunu algılar ve yazmak yerine talimatlarla `2` ile çıkar. İki desteklenen yol — CLI'yi ana makinede kurmak ve konteynere `omniroute connect` yapmak veya yapılandırma dizinlerini bağlamak ve `CLI_CONFIG_HOME` ayarlamaktır (compose `host` profili). Her `setup-*` komutu, ayrıca `omniroute configure` ve `omniroute config set`, konteynerin kendi CLIs'ini yapılandırmanın gerçekten ne anlama geldiği durumunda `--allow-container-write` alır; `OMNIROUTE_ALLOW_CONTAINER_CONFIG_WRITE=true` sunucu için aynı şeyi yapar. Bakınız
[Docker Kılavuzu → Ana CLI araçlarını yapılandırma](../guides/DOCKER_GUIDE.md#configuring-host-cli-tools-when-omniroute-runs-in-docker).

Kontrol panelinin **uygulama uç noktası** (`POST /api/cli-tools/apply`) aynı korumayı uygular: bir konteynerde, hedefi ana makineden bağlanmamış bir yazma işlemi **`422`** ile `containerEphemeralTarget: true` yanıtını verir, güvenli hata metni ve — ana makine tarifi olan araçlar için (claude, codex, opencode, cline, kilo, continue) — ana makinede çalıştırılacak bir `hostSetupCommand` (örneğin `omniroute setup-opencode`); hiçbir şey yazılmaz. `dryRun: true` konteyner modunda çalışmaya devam eder ve diskle temas etmeden üretilen içeriği + hedef yolunu döndürür, böylece kontrol panelinden önizleme yapabilir ve ana makinede uygulayabilirsiniz. Bu davranış kasıtlıdır ve `tests/unit/api/cli-tools/apply-container-guard.test.ts` ile geriye dönük olarak korunmaktadır — asla bir 422'yi korumayı kaldırarak "düzeltmeyin".

---

## Gerçek Kaynağı

Birleşik katalog `src/shared/constants/cliTools.ts` içinde `CLI_TOOLS: Record<string, CliCatalogEntry>` olarak yer almaktadır.

Her bir girişin bu alanları vardır (tanımlı `src/shared/schemas/cliCatalog.ts` içinde):

| Alan                                            | Tür                                                          | Açıklama                                               |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `category`                                      | `"code" \| "agent"`                                          | Araç hangi sayfada görünür                             |
| `vendor`                                        | `string`                                                     | Araç kaynağı ("Anthropic", "OSS (P. Gauthier)")        |
| `acpSpawnable`                                  | `boolean`                                                    | ACP Ajanı olarak da kullanılabilir (rozet gösterilir)  |
| `baseUrlSupport`                                | `"full" \| "partial" \| "none"`                              | Özel uç nokta destek seviyesi. `"none"` = MITM backlog |
| `configType`                                    | `"env" \| "custom" \| "guide" \| "custom-builder" \| "mitm"` | Yapılandırma mekanizması                               |
| `id`, `name`, `color`, `description`, `docsUrl` | standart                                                     | Temel görüntüleme alanları                             |

`baseUrlSupport: "none"` olan girişler, gösterim sayfalarında **gösterilmez** — bunlar plan 11 için MITM backlog'unda kaydedilmiştir (bkz. `_tasks/features-v3.8.6/refactorpages/_orchestration/_plan11-mitm-backlog.md`).

### Yetenek katmanları (kataloglu × tespit edilebilir × yapılandırılabilir × başlatılabilir)

Her kataloglu araç tespit edilebilir, yapılandırılabilir veya başlatılabilir değildir. Her katmanın bir
belirleyici kaynağı vardır ve bir drift testi bunları uyumlu tutar:

| Katman                 | Anlamı                                                                         | Belirtilen                                                         |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Kataloglu**          | Gösterim katalogunda görünür (isim, satıcı, belgeler, yapılandırma türü)       | `src/shared/constants/cliTools.ts` (`CLI_TOOLS`)                   |
| **Tespit Edilebilir**  | İkili/yapılandırma tespiti, sağlık kontrolleri, yapılandırma yolları           | `src/shared/services/cliRuntime.ts` (`CLI_TOOLS` çalışma kataloğu) |
| **Yapılandırılabilir** | `omniroute configure <cli>` tarafından desteklenir (kurulum tarifi mevcut)     | `bin/cli/cli-manifest.mjs` (`configure: true`)                     |
| **Başlatılabilir**     | `omniroute run <target>` tarafından desteklenir (env/args enjeksiyonu tanımlı) | `bin/cli/cli-manifest.mjs` (`run: true`)                           |

`bin/cli/cli-manifest.mjs`, CLI komut yüzeyleri için kanonik yürütülebilir manifestodur: `run`, `configure` ve shell-tamamlayıcı jeneratörleri tüm hedef listelerini, takma ad çözümlemelerini (örneğin `kilocode`/`kilo-code`/`kilo_cli` → `kilo`) ve `--model` bayrağı bağlantılarını buradan alır. Drift koruma
`tests/unit/cli/cli-manifest-drift.test.ts`, manifestonun, çalışma
kataloğunun, UI kataloğunun ve her tüketici yüzeyinin senkron kalmasını sağlar — bir yüzeye eklenen bir hedef, diğerleri olmadan eklenirse, sessizce drift etmek yerine test grubunu başarısız kılar.

## 1. CLI Kod Kataloğu (26 araç)

`/dashboard/cli-code` içinde yer alan tüm araçlar. `baseUrlSupport: none` olanlar, özel bir temel URL yerine MITM veya manuel bir kılavuz aracılığıyla bağlanmıştır:

| id           | isim                      | satıcı                        | baseUrlSupport | configType     | acpSpawnable |
| ------------ | ------------------------- | ----------------------------- | -------------- | -------------- | ------------ |
| claude       | Claude Kodu               | Anthropic                     | full           | env            | true         |
| codex        | OpenAI Codex CLI          | OpenAI                        | full           | custom         | true         |
| zcode        | ZCode (GLM Kodlama Planı) | Z.ai                          | none           | custom         | false        |
| cline        | Cline                     | OSS (eski-Claude Geliştirici) | full           | custom         | true         |
| kilo         | Kilo Kodu                 | Kilo-Org                      | full           | custom         | false        |
| roo          | Roo Kodu                  | Roo (OSS)                     | full           | guide          | false        |
| continue     | Devam Et                  | continue.dev                  | full           | guide          | false        |
| aider        | Aider                     | OSS (P. Gauthier)             | full           | guide          | true         |
| forge        | ForgeCode                 | Antinomy HQ                   | full           | custom         | true         |
| jcode        | jcode                     | 1jehuang (OSS)                | full           | custom         | false        |
| deepseek-tui | DeepSeek TUI              | Hunter Bown (OSS)             | full           | custom         | false        |
| codewhale    | CodeWhale                 | Hmbown (OSS)                  | full           | custom         | false        |
| opencode     | OpenCode                  | Anomaly (eski-SST)            | full           | guide          | true         |
| droid        | Factory Droid             | Factory AI                    | partial        | guide          | false        |
| copilot      | GitHub Copilot CLI        | GitHub/MS                     | full           | custom         | false        |
| cursor-cli   | Cursor CLI                | Anysphere                     | partial        | guide          | true         |
| smelt        | Smelt                     | leonardcser (OSS)             | full           | custom         | false        |
| pi           | Pi (pi-coding-agent)      | M. Zechner (OSS)              | full           | custom         | false        |
| grok-build   | Grok Build                | xAI                           | full           | custom         | false        |
| crush        | Crush                     | OSS (Charm)                   | full           | custom         | false        |
| qwen         | Qwen Kodu                 | Alibaba                       | full           | guide          | true         |
| cursor       | Cursor                    | Anysphere                     | none           | guide          | false        |
| antigravity  | Antigravity               | Google                        | none           | mitm           | false        |
| hermes       | Hermes                    | Nous Research                 | none           | guide          | false        |
| kiro         | Kiro AI                   | Amazon                        | none           | mitm           | false        |
| custom       | Özel CLI                  | —                             | full           | custom-builder | false        |

`baseUrlSupport: "partial"` olan araçlar, gösterge paneli kartında "⚠ Temel URL kısmi" rozetini gösterir.

## 2. CLI Ajanları Kataloğu (8 araç)

`/dashboard/cli-agents` içinde görünen otonom ajanlar:

| id           | isim             | satıcı                   | baseUrlDestek | acpSpawnable |
| ------------ | ---------------- | ------------------------ | ------------- | ------------ |
| hermes-agent | Hermes Ajanı     | Nous Research            | tam           | false        |
| openclaw     | OpenClaw         | OSS (P. Steinberger)     | tam           | true         |
| goose        | Goose            | Block / Linux Foundation | tam           | true         |
| interpreter  | Open Interpreter | OSS                      | tam           | true         |
| warp         | Warp AI          | Warp Inc.                | kısmi         | true         |
| agent-deck   | Ajan Destesi     | asheshgoplani (OSS)      | tam           | false        |
| omp          | Oh My Pi         | OSS                      | tam           | true         |
| letta        | Letta CLI        | Letta                    | tam           | false        |

---

## 3. ACP Ajanları (/dashboard/acp-agents)

Bu sayfa (`/dashboard/agents`'dan yeniden adlandırılmıştır) OmniRoute'un stdio/ACP protokolü aracılığıyla **oluşturabileceği** arka uç yürütme motorlarını gösterir. Katalog, `src/lib/acp/registry.ts` içinde ayrı olarak korunmaktadır ve `CLI_TOOLS` ile **aynı değildir**.

---

## 4. MITM Bekleme Listesi (dashboard'da gösterilmez)

Aşağıdaki CLIs yerel olarak özel bir temel URL'yi desteklememektedir ve CLI Kodu veya CLI Ajanları sayfalarında **listelenmemiştir**. Plan 11'de MITM müdahalesi için adaylardır:

| CLI                 | Sebep                                              |
| ------------------- | -------------------------------------------------- |
| windsurf            | BYOK, seçili Claude modelleri + kurumsal URL/token |
| amp                 | Kapalı ekosistem (Sourcegraph)                     |
| amazon-q / kiro-cli | AWS SSO kimlik doğrulama, özel URL yok             |
| cowork              | Anthropic Desktop, yapılandırılabilir uç nokta yok |

Tam çapraz referans için `_tasks/features-v3.8.6/refactorpages/_orchestration/_plan11-mitm-backlog.md`'ye bakın.

---

## 5. Batch Tespit API'si

Tüm araç tespiti tek bir uç nokta üzerinden toplanmaktadır:

**`GET /api/cli-tools/all-statuses`**

- Yetki: `requireCliToolsAuth(request)` (diğer `/api/cli-tools/` yollarıyla aynı)
- Döner: `Record<toolId, ToolBatchStatus>` (tip: `src/shared/types/cliBatchStatus.ts`)
- Strateji: Tüm araçlar üzerinde `Promise.all`, her araç için 5s zaman aşımı
- Önbellek: yapılandırma dosyası `mtime` ile indekslenmiş bellek içi LRU. mtime değiştiğinde önbellek geçersiz kılınır. Sunucu yeniden başlatıldığında sıfırlanır.

Araç başına yanıt şekli:

```ts
interface ToolBatchStatus {
  detection: {
    installed: boolean;
    runnable: boolean;
    version?: string;
    command?: string;
    commandPath?: string;
    reason?: string;
  };
  config: {
    status: "configured" | "not_configured" | "not_installed" | "unknown" | "other";
    endpoint?: string | null;
    lastConfiguredAt?: string | null;
  };
  error?: string; // temizlenmiş, yığın izleri yok
}
```

## 6. Yeni Araçlar için Ayar İşleyicileri

`configType: "custom"` olan yeni araçların özel ayar API yolları vardır:

| Yol                                         | Araç                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `POST /api/cli-tools/forge-settings`        | ForgeCode (.forge.toml)                                                    |
| `POST /api/cli-tools/jcode-settings`        | jcode (--base-url bayrağı)                                                 |
| `POST /api/cli-tools/deepseek-tui-settings` | DeepSeek TUI (OPENAI_BASE_URL, eski)                                       |
| `POST /api/cli-tools/codewhale-settings`    | CodeWhale (OPENAI_BASE_URL, birincil + eski `~/.deepseek` senkronizasyonu) |
| `POST /api/cli-tools/smelt-settings`        | Smelt                                                                      |
| `POST /api/cli-tools/pi-settings`           | Pi kodlama aracı                                                           |
| `POST /api/cli-tools/grok-build-settings`   | Grok Build (~/.grok/config.toml, `[model.omniroute]`)                      |
| `POST /api/cli-tools/qwen-settings`         | Qwen Code (`~/.qwen/settings.json` + özel `.env` anahtarı)                 |

Tüm yollar hata yanıtları için `sanitizeErrorMessage()` kullanır (Sert Kural #12).

---

## 7. Gösterge Paneli Sayfaları Mimarisi

### CLI Kodu (`/dashboard/cli-code`)

- `src/app/(dashboard)/dashboard/cli-code/page.tsx` — sunucu bileşeni
- `src/app/(dashboard)/dashboard/cli-code/CliCodePageClient.tsx` — istemci ızgarası
- `src/app/(dashboard)/dashboard/cli-code/[id]/page.tsx` — araç detay sayfası
- `src/app/(dashboard)/dashboard/cli-code/components/` — 12 özel araç kartı + `ToolDetailClient.tsx`

### CLI Ajanları (`/dashboard/cli-agents`)

- `src/app/(dashboard)/dashboard/cli-agents/page.tsx` — sunucu bileşeni
- `src/app/(dashboard)/dashboard/cli-agents/CliAgentsPageClient.tsx` — istemci ızgarası
- `src/app/(dashboard)/dashboard/cli-agents/[id]/page.tsx` — `ToolDetailClient`'i yeniden kullanır

### ACP Ajanları (`/dashboard/acp-agents`)

- `src/app/(dashboard)/dashboard/acp-agents/page.tsx` — sunucu bileşeni ( `agents/`'dan taşındı)

### Paylaşılan UI Bileşenleri (`src/shared/components/cli/`)

| Dosya                   | Amaç                                                  |
| ----------------------- | ----------------------------------------------------- |
| `CliToolCard.tsx`       | Akıllı durum kartı (tespit + yapılandırma + uç nokta) |
| `CliConceptCard.tsx`    | Sayfa başına kavram açıklama kartı                    |
| `CliComparisonCard.tsx` | CLI türleri arasında üç sütunlu karşılaştırma         |
| `BaseUrlSelect.tsx`     | Uç nokta açılır menüsü (Yerel/Bulut/Özel)             |
| `ApiKeySelect.tsx`      | API anahtarı seçici                                   |
| `ManualConfigModal.tsx` | Kopyalanabilir yapılandırma kesiti modali             |

### Paylaşılan Hook (`src/shared/hooks/cli/`)

| Dosya                     | Amaç                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `useToolBatchStatuses.ts` | `/api/cli-tools/all-statuses`'i alır, yükleme/yenileme durumunu yönetir |

## 8. i18n

Plan 14 F9'da eklenen yeni ad alanları:

| Ad Alanı    | Amaç                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| `cliCommon` | Paylaşılan metinler (kart etiketleri, kavram/kıyas metinleri, detay sayfası etiketleri) |
| `cliCode`   | CLI Kodu sayfası metinleri                                                              |
| `cliAgents` | CLI Ajanları sayfası metinleri                                                          |
| `acpAgents` | ACP Ajanları sayfası metinleri                                                          |

Tam PT-BR ve EN çevirileri sağlanmıştır. 39 diğer yerel ayar, `src/i18n/request.ts` içindeki ad alanı düzeyinde birleştirme ile otomatik olarak EN'ye geri döner.

---

## 9. Hızlı Başlangıç

### Adım 1 — OmniRoute API Anahtarı Alın

1. `/dashboard/api-manager`'ı açın → **API Anahtarı Oluştur**
2. Bir isim verin (örn. `cli-tools`) ve tüm izinleri seçin
3. Anahtarı kopyalayın — aşağıdaki her CLI için buna ihtiyacınız olacak

> Anahtarınız şöyle görünecek: `sk-xxxxxxxxxxxxxxxx-xxxxxxxxx`

---

### Adım 2 — CLI Araçlarını Yükleyin

Tüm npm tabanlı araçlar Node.js 22.22.2+ veya 24.x gerektirir:

```bash
# Claude Code (Anthropic)
npm install -g @anthropic-ai/claude-code

# OpenAI Codex
npm install -g @openai/codex

# OpenCode
npm install -g opencode-ai

# Cline
npm install -g cline

# KiloCode
npm install -g kilocode

# Qwen Code
npm install -g @qwen-code/qwen-code

# Google Gemini CLI (launchable via `omniroute run gemini` → /v1beta surface)
npm install -g @google/gemini-cli

# Aider
pip install aider-chat

# Smelt
cargo install smelt  # Rust tabanlı

# Pi coding agent
# yükleme için https://github.com/zechnerj/pi-coding-agent adresine bakın

# jcode
# yükleme için https://github.com/1jehuang/jcode adresine bakın
```

---

### Adım 3 — Dashboard Üzerinden Yapılandırın

1. `http://localhost:20128/dashboard/cli-code` adresine gidin
2. Araçlar ızgarasında aracınızı bulun
3. Aracı detay sayfasını açmak için karta tıklayın
4. API anahtarınızı ve temel URL'yi seçin
5. **Yapılandırmayı Uygula**'ya tıklayın veya manuel yapılandırma parçasını kopyalayın

---

### Adım 4 — Küresel Ortam Değişkenlerini Ayarlayın

```bash
# OmniRoute Evrensel Uç Noktası
export OPENAI_BASE_URL="http://localhost:20128/v1"
export OPENAI_API_KEY="sk-your-omniroute-key"
export ANTHROPIC_BASE_URL="http://localhost:20128"
export ANTHROPIC_AUTH_TOKEN="sk-your-omniroute-key"
# Gemini CLI, KÖK'te GOOGLE_GEMINI_BASE_URL okur (SDK'sı /v1beta/... ekler)
export GOOGLE_GEMINI_BASE_URL="http://localhost:20128"
export GEMINI_API_KEY="sk-your-omniroute-key"
```

> **Uzak bir sunucu** için `localhost:20128`'i sunucu IP'si veya alan adı ile değiştirin,
> örn. `http://<your-server-ip>:20128`.

---

### Adım 4 — Her Aracı Yapılandırın

#### Claude Code

```bash
# ~/.claude/settings.json oluşturun:
mkdir -p ~/.claude && cat > ~/.claude/settings.json << EOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:20128",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-omniroute-key"
  }
}
EOF
```

Claude Code için birleşik Anthropic geçiş kökünü kullanın. Burada `/v1` eklemeyin.

**Test:** `claude "merhaba de"`

---

#### OpenAI Codex

Modern Codex (v0.137+) yalnızca `~/.codex/config.toml` dosyasını okur — eski
`config.yaml`, miras npm CLI'ye aittir ve sessizce yok sayılır. API
anahtarı, dosya içinde asla değil, `OMNIROUTE_API_KEY` ortam değişkeninde (`env_key`) kalır:

```bash
mkdir -p ~/.codex && cat > ~/.codex/config.toml << EOF
model_provider = "omniroute"

[model_providers.omniroute]
name                 = "OmniRoute"
base_url             = "http://localhost:20128/v1"
env_key              = "OMNIROUTE_API_KEY"
requires_openai_auth = false
EOF
export OMNIROUTE_API_KEY="sk-your-omniroute-key"
```

Tam referans (profiller, `wire_api`, bağlam pencereleri): [CODEX-CLI-CONFIGURATION.md](../guides/CODEX-CLI-CONFIGURATION.md).

**Test:** `codex "2+2 nedir?"`

---

#### OpenCode

```bash
mkdir -p ~/.config/opencode && cat > ~/.config/opencode/opencode.json << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "omniroute": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "OmniRoute",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "sk-your-omniroute-key"
      },
      "models": {
        "claude-sonnet-4-5": { "name": "claude-sonnet-4-5" },
        "claude-sonnet-4-5-thinking": { "name": "claude-sonnet-4-5-thinking" },
        "gemini-3-flash": { "name": "gemini-3-flash" }
      }
    }
  }
}
EOF
```

**Test:** `opencode`

> Düşünme varyantlarını göndermek için `opencode run "prompt'iniz" --model omniroute/claude-sonnet-4-5-thinking --variant high` kullanın.

---

#### Cline (CLI veya VS Code)

**CLI modu:**

```bash
mkdir -p ~/.cline/data && cat > ~/.cline/data/globalState.json << EOF
{
  "apiProvider": "openai",
  "openAiBaseUrl": "http://localhost:20128/v1",
  "openAiApiKey": "sk-your-omniroute-key"
}
EOF
```

**VS Code modu:**
Cline uzantı ayarları → API Sağlayıcı: `OpenAI Uyumluluğu` → Temel URL: `http://localhost:20128/v1`

Ya da OmniRoute dashboard'unu kullanarak → **CLI Araçları → Cline → Yapılandırmayı Uygula**.

---

#### KiloCode (CLI veya VS Code)

**CLI modu:**

```bash
kilocode --api-base http://localhost:20128/v1 --api-key sk-your-omniroute-key
```

**VS Code ayarları:**

```json
{
  "kilo-code.openAiBaseUrl": "http://localhost:20128/v1",
  "kilo-code.apiKey": "sk-your-omniroute-key"
}
```

Ya da OmniRoute dashboard'unu kullanarak → **CLI Araçları → KiloCode → Yapılandırmayı Uygula**.

---

#### Continue (VS Code Uzantısı)

`~/.continue/config.yaml` dosyasını düzenleyin:

```yaml
models:
  - name: OmniRoute
    provider: openai
    model: auto
    apiBase: http://localhost:20128/v1
    apiKey: sk-your-omniroute-key
    default: true
```

Düzenledikten sonra VS Code'u yeniden başlatın.

---

#### VS Code Insiders (`chatLanguageModels.json`)

VS Code Insiders, özel uç nokta modelleri için yapılandırıldığında ve OmniRoute'un özel bir başlık alanı olmadan çalışmasını istediğinizde bunu kullanın.

**Tavsiye edilen konum:**

- Linux: `~/.config/Code - Insiders/User/chatLanguageModels.json`
- Windows: `%APPDATA%/Code - Insiders/User/chatLanguageModels.json`

**Tokenize edilmiş OmniRoute takma adını kullanarak örnek:**

```json
[
  {
    "vendor": "customendpoint",
    "id": "auto",
    "name": "OmniRoute Auto",
    "family": "gpt-4",
    "version": "1.0.0",
    "url": "http://localhost:20128/api/v1/vscode/sk-your-omniroute-key/chat/completions",
    "modelsUrl": "http://localhost:20128/api/v1/vscode/sk-your-omniroute-key/models",
    "requestFormat": "openai-chat-completions",
    "contextWindow": 256000,
    "maxOutputTokens": 32768,
    "auth": {
      "type": "none"
    }
  }
]
```

**Notlar:**

- `sk-your-omniroute-key`'i OmniRoute'da oluşturulan bir API anahtarı ile değiştirin.
- `url` alanı `/api/v1/vscode/{token}/chat/completions`'a işaret etmelidir.
- `modelsUrl` alanı `/api/v1/vscode/{token}/models`'a işaret etmelidir.
- İstemci özel başlıkları desteklediğinde normal `/v1` + Bearer başlık akışını tercih edin.
- URL'ye gömülü tokenler, uyumluluk geri dönüşü olarak kullanılmaktadır ve editör günlüklerinde veya proxy geçmişinde görünebilir.

---

#### Kiro CLI (Amazon)

```bash
# AWS/Kiro hesabınıza giriş yapın:
kiro-cli login

# CLI kendi kimlik doğrulamasını kullanır — Kiro CLI için arka uç olarak OmniRoute gerekli değildir.
# Diğer araçlar için OmniRoute ile birlikte kiro-cli kullanın.
kiro-cli status
```

**Kiro IDE** masaüstü uygulaması için, OmniRoute tarafından sağlanan MITM uç noktasını kullanın
`/dashboard/cli-tools → Kiro` altında.

## 10. Dahili OmniRoute CLI

`omniroute` ikili dosyası, sunucu yaşam döngüsü, kurulum, tanılama ve sağlayıcı yönetimi için komutlar sağlar. Giriş noktası: `bin/omniroute.mjs`.

```bash
omniroute                              # Sunucuyu başlat (varsayılan port 20128)
omniroute setup                        # Etkileşimli kurulum sihirbazı
omniroute doctor                       # Yapılandırmayı, DB'yi, portları, çalışma zamanını kontrol et
omniroute providers list               # Yapılandırılmış sağlayıcı bağlantıları
omniroute providers test-all           # Her aktif bağlantıyı test et
omniroute reset-password               # Yönetici şifresini sıfırla
omniroute logs                         # İstek günlüklerini akıt
omniroute health                       # Ayrıntılı sağlık durumu (kesiciler, önbellek, bellek)
omniroute --version                    # Sürümü yazdır
omniroute --help                       # Tüm komutları göster
```

### Kurulum ve Başlatma

```bash
omniroute setup                        # Etkileşimli kurulum sihirbazı
omniroute setup --non-interactive      # CI/otomasyon modu (çevre değişkenlerini + bayrakları okur)
omniroute setup --password '<value>'   # Yönetici şifresini doğrudan ayarla
omniroute setup --add-provider \
  --provider openai \
  --api-key '<value>' \
  --test-provider                      # Bir sağlayıcıyı ekle ve test et
```

Etkileşimli olmayan kurulum için tanınan çevre değişkenleri:

| Var                 | Amaç                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| `OMNIROUTE_API_KEY` | Sağlayıcı API anahtarı (Commander `.env()` aracılığıyla `--api-key` ile bağlanır) |
| `DATA_DIR`          | OmniRoute veri dizinini geçersiz kıl                                              |

Diğer tüm etkileşimli olmayan girdiler bayraklar olarak geçilir, çevre değişkenleri olarak değil:
`--password`, `--provider`, `--provider-name`, `--provider-base-url`, `--default-model`
(bkz. yukarıdaki `omniroute setup` seçenekleri).

### Tanılama

```bash
omniroute doctor                       # Yapılandırmayı, DB'yi, portları, çalışma zamanını, belleği, canlılığı kontrol et
omniroute doctor --json                # Makine okunabilir JSON
omniroute doctor --no-liveness         # HTTP sağlık sorgusunu atla
omniroute doctor --host 0.0.0.0        # Canlılık ana bilgisayarını geçersiz kıl
omniroute doctor --liveness-url <url>  # Tam sağlık uç noktası URL'sini geçersiz kıl
```

Doktor bu kontrolleri yapar: `Yapılandırma`, `Veritabanı`, `Depolama/şifreleme`,
`Port kullanılabilirliği`, `Node çalışma zamanı`, `Yerel ikili` (better-sqlite3),
`Bellek` ve `Sunucu canlılığı`. Herhangi bir kontrol `başarısız` olursa sıfırdan farklı bir çıkış yapar.

### Sağlayıcı Yönetimi

```bash
omniroute providers available                       # OmniRoute sağlayıcı kataloğu
omniroute providers available --search openai       # Kataloğu id/ad/alias/kategoriye göre filtrele
omniroute providers available --category api-key    # Kategoriye göre filtrele (api-key, oauth, ücretsiz, ...)
omniroute providers available --json                # Makine okunabilir JSON

omniroute providers list                            # Yapılandırılmış sağlayıcı bağlantıları
omniroute providers list --json

omniroute providers test <id|name>                  # Bir yapılandırılmış bağlantıyı test et
omniroute providers test-all                        # Her aktif bağlantıyı test et
omniroute providers validate                        # Yerel yalnızca yapısal doğrulama
omniroute providers add <provider> --credential-env PROVIDER_KEY
omniroute providers import ./providers.json --dry-run --json
omniroute providers auth <provider>                 # Mevcut OAuth akışı
omniroute providers edit <id|name> --default-model <model>
omniroute providers remove <id|name> --yes
```

`providers add/import/auth/edit/remove` API-first'tır ve bu nedenle
aktif yerel veya uzaktan bağlama karşı çalışır. Kimlik bilgisi girişi
`--credential-stdin` veya `--credential-env` kullanmalıdır; `--dry-run --json` yalnızca
gizlenmiş varlık/şekil raporları. `providers available` OmniRoute kataloğunu okur;
`providers list/test/test-all/validate` yerel SQLite davranışlarını korur ve
sunucunun çalışmasını gerektirmez.

### Kurtarma ve Sıfırlama

```bash
omniroute reset-password                # Yönetici şifresini sıfırla (ayrıca: omniroute-reset-password)
omniroute reset-encrypted-columns       # Şifreli kimlik bilgisi sıfırlama için uyarı göster + kuru çalışma
omniroute reset-encrypted-columns --force  # SQLite'daki şifreli kimlik bilgilerini gerçekten sıfırla
```

### Kimlik Bilgisi Dışa Aktarma (⚠ dikkatli kullanın)

```bash
omniroute auth export                                 # Uyarı göster + onay kapısı — DB erişimi yok
omniroute auth export --force                          # Tüm bağlantıların ŞİFRESİZ kimlik bilgilerini stdout'a JSON olarak dışa aktar
omniroute auth export --force --id <id>                 # Sadece eşleşen bağlantıyı dışa aktar
omniroute auth export --force --format env               # OMNIROUTE_<PROVIDER>_<FIELD>=<value> satırlarını yayınla
omniroute auth export --force --out creds.json           # Bir dosyaya yaz (0600 izinleri ile oluşturulur)
```

`auth export` **yerel yalnızca** (doğrudan SQLite okuma, HTTP rotası yok) ve kasıtlı olarak **düz metin** `apiKey`/`accessToken`/`refreshToken`/`idToken` değerlerini yazdırır/yazar — bu bir özellik, hata değil. Veritabanından hiçbir şey okunmaz ve hiçbir şey şifrelenmez, `--force` olmadan. Herhangi bir düz metin yayımlanmadan önce her zaman bir stderr uyarı bandı yazdırılır. `STORAGE_ENCRYPTION_KEY` ayarlanmış olmalıdır. Şifrelemeyi başaramayan bir alan (eski anahtar, bozuk şifreli metin) `export` işlemini durdurmak veya temel hatayı sızdırmak yerine `"<field>DecryptFailed: true"` olarak rapor edilir.

### Diğer alt komutlar

Bunlar, aksi belirtilmedikçe çalışan bir OmniRoute sunucusu varsayar:

```bash
omniroute status                       # Kapsamlı çalışma durumu
omniroute logs                         # İstek günlüklerini akıt (--json, --search, --follow)
omniroute config show                  # Mevcut yapılandırmayı görüntüle

omniroute provider list                # Mevcut sağlayıcıları listele (providers list'in takma adı)
omniroute provider add                 # OmniRoute'u bir araçta sağlayıcı olarak kaydet
omniroute keys add | list | remove     # API anahtarlarını yönet
omniroute models [provider]            # Modelleri listele (--json, --search)
omniroute combo list | switch | create | delete

omniroute backup                       # Yapılandırma + DB anlık görüntüsü
omniroute restore                      # Önceki bir anlık görüntüden geri yükle

omniroute health                       # Ayrıntılı sağlık durumu (kesiciler, önbellek, bellek)
omniroute quota                        # Sağlayıcı kota kullanımı
omniroute cache                        # Önbellek durumu
omniroute cache clear                  # Anlamsal + imza önbelleklerini temizle

omniroute mcp status | restart         # MCP sunucu durumu / yeniden başlat
omniroute a2a status | card            # A2A sunucu durumu / ajan kartı

omniroute tunnel list | create | stop  # Tünelleri yönet (cloudflare/tailscale/ngrok)
omniroute env show | get <k> | set <k> <v>  # Çevre değişkenlerini denetle / ayarla (geçici)

omniroute test                         # Sağlayıcı bağlantı testi
omniroute update                       # Güncellemeleri kontrol et
omniroute completion                   # Shell tamamlama oluştur
```

### Yaygın bayraklar

| Bayrak              | Açıklama                                                  |
| ------------------- | --------------------------------------------------------- |
| `--no-open`         | Başlangıçta tarayıcıyı otomatik açma                      |
| `--port <n>`        | API portunu geçersiz kıl (varsayılan 20128)               |
| `--mcp`             | IDE'ler için stdio üzerinden MCP sunucusu olarak çalıştır |
| `--non-interactive` | CI modu (hiçbir istem; çevre/bayraklardan okur)           |
| `--json`            | Makine okunabilir JSON çıktısı (doctor, providers, vb.)   |
| `--help`, `-h`      | Komut spesifik yardım göster                              |
| `--version`, `-v`   | Yüklenen sürümü yazdır                                    |

---

## Mevcut API Uç Noktaları

| Uç Nokta                   | Açıklama                           | Kullanım Alanı                  |
| -------------------------- | ---------------------------------- | ------------------------------- |
| `/v1/chat/completions`     | Standart sohbet (tüm sağlayıcılar) | Tüm modern araçlar              |
| `/v1/responses`            | Yanıtlar API'si (OpenAI formatı)   | Codex, ajans iş akışları        |
| `/v1/completions`          | Eski metin tamamlama               | `prompt:` kullanan eski araçlar |
| `/v1/embeddings`           | Metin gömme                        | RAG, arama                      |
| `/v1/images/generations`   | Görüntü üretimi                    | GPT-Image, Flux, vb.            |
| `/v1/audio/speech`         | Metinden sese                      | ElevenLabs, OpenAI TTS          |
| `/v1/audio/transcriptions` | Sesten metne                       | Deepgram, AssemblyAI            |

Yapıştırmaya hazır örnekler ile token'lı OmniRoute URL'si:

```txt
Token örneği: sk-a3ab3c080beaee3a-69f4a4-070d71af

Standart OpenAI tabanı: http://localhost:20128/v1
VS Code modelleri: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/models
VS Code sohbeti: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/chat/completions
VS Code yanıtları: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/responses
Ollama etiketleri: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/api/tags
Ollama sohbeti: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/api/chat
```

---

## Sorun Giderme

| Hata                                                 | Sebep                              | Çözüm                                             |
| ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| `Connection refused`                                 | OmniRoute çalışmıyor               | `omniroute serve`                                 |
| `401 Unauthorized`                                   | Yanlış API anahtarı                | `/dashboard/api-manager` içinde kontrol edin      |
| `No combo configured`                                | Aktif yönlendirme kombinasyonu yok | `/dashboard/combos` içinde ayarlayın              |
| CLI "not installed" gösteriyor                       | İkili dosya PATH'te değil          | `which <command>` kontrol edin                    |
| Dashboard kurulumdan sonra "not detected" gösteriyor | Önbellek eski                      | Dashboard'da "⟳ Tespiti yenile" butonuna tıklayın |
| Eski bağlantı `/dashboard/cli-tools`                 | Pre-v3.8.6 yer imi                 | `/dashboard/cli-code` (308) yönlendirilmiştir     |
| Eski bağlantı `/dashboard/agents`                    | Pre-v3.8.6 yer imi                 | `/dashboard/acp-agents` (308) yönlendirilmiştir   |
