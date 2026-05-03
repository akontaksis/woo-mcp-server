# WooCommerce MCP Server

MCP (Model Context Protocol) server που εκθέτει το WooCommerce REST API ως εργαλεία (tools) προς οποιονδήποτε MCP-compatible client (Claude Desktop, Claude Code, custom chatbots κ.ά.). Δίνει σε AI assistants τη δυνατότητα να διαβάζουν παραγγελίες, προϊόντα, πελάτες, κουπόνια και αναφορές από ένα ή περισσότερα WooCommerce stores με φυσική γλώσσα.

---

## Περιεχόμενα

- [Επισκόπηση](#επισκόπηση)
- [Διαθέσιμα Tools](#διαθέσιμα-tools)
- [Προαπαιτούμενα](#προαπαιτούμενα)
- [Εγκατάσταση](#εγκατάσταση)
- [Setup σε νέο υπολογιστή (από μηδέν)](#setup-σε-νέο-υπολογιστή-από-μηδέν)
- [Ρύθμιση](#ρύθμιση)
  - [1. Δημιουργία WooCommerce API Keys](#1-δημιουργία-woocommerce-api-keys)
  - [2. Δημιουργία αρχείου site .env](#2-δημιουργία-αρχείου-site-env)
  - [3. Κρίσιμες ρυθμίσεις WooCommerce](#3-κρίσιμες-ρυθμίσεις-woocommerce)
- [Multi-site Support](#multi-site-support)
- [Χρήση](#χρήση)
  - [Με Claude Desktop](#με-claude-desktop)
  - [Με Claude Code](#με-claude-code)
  - [Έλεγχος μέσω test suite](#έλεγχος-μέσω-test-suite)
- [Tools Reference](#tools-reference)
- [Δομή Project](#δομή-project)
- [Troubleshooting](#troubleshooting)
- [Επέκταση](#επέκταση)
- [Διαφορές vs Smart AI Chatbot](#διαφορές-vs-smart-ai-chatbot)
- [License](#license)

---

## Επισκόπηση

```
┌──────────────────┐         stdio          ┌──────────────────┐
│  MCP Client      │ ─── tool calls ──────▶ │  MCP Server      │
│  (Claude, etc)   │ ◀── results ──────── │  (αυτό το repo)  │
└──────────────────┘                        └────────┬─────────┘
                                                     │ HTTPS + Basic Auth
                                                     ▼
                                            ┌──────────────────┐
                                            │  WooCommerce     │
                                            │  REST API        │
                                            └──────────────────┘
```

Η επικοινωνία client ↔ server γίνεται μέσω **stdio**, όπερ σημαίνει ότι ο server τρέχει σαν child process του client στον ίδιο υπολογιστή.

---

## Διαθέσιμα Tools

| Κατηγορία | Tool | Περιγραφή |
|---|---|---|
| **Orders** | `get_orders` | Λίστα παραγγελιών με filters (status, customer, ημερομηνία) + summary aggregations |
| | `get_order_by_id` | Πλήρεις λεπτομέρειες παραγγελίας (items, addresses, payment, totals) |
| **Products** | `get_products` | Λίστα προϊόντων με filters (κατηγορία, stock, on sale, search) |
| | `get_product_by_id` | Πλήρεις λεπτομέρειες προϊόντος |
| | `get_low_stock_products` | Προϊόντα κάτω από threshold (σαρώνει όλο το catalog, με pagination) |
| | `get_product_categories` | Όλες οι κατηγορίες με αριθμό προϊόντων |
| **Customers** | `get_customers` | Λίστα εγγεγραμμένων πελατών με βασικά στοιχεία |
| | `get_customer_by_id` | Προφίλ πελάτη με computed stats (orders, total spent, avg order) |
| | `get_top_customers` | Top spenders μέσω WooCommerce Analytics |
| **Coupons** | `get_coupons` | Λίστα κουπονιών με `active_only` filter |
| | `get_coupon_by_code` | Λεπτομέρειες κουπονιού |
| | `get_expiring_coupons` | Κουπόνια που λήγουν σε X ημέρες |
| **Reports** | `get_sales_report` | Πωλήσεις ανά περίοδο |
| | `get_top_selling_products` | Best sellers ανά περίοδο |
| | `get_orders_report` | Σύνολα παραγγελιών ανά status |
| | `get_products_report` | Σύνολα προϊόντων ανά τύπο |
| | `get_customers_report` | Registered vs guests |

Όλες οι αποκρίσεις είναι **read-only**, με τιμές formatted σε ευρώ (`€45,50`) και ημερομηνίες σε ελληνικό format.

---

## Προαπαιτούμενα

- **Node.js 18+** (ESM support, native `fetch` ή `node-fetch`)
- **WooCommerce store** με ενεργοποιημένο REST API (default σε όλες τις σύγχρονες εκδόσεις)
- **WooCommerce API key** με `Read` permissions, δεμένο σε WP user με ρόλο **Administrator** ή **Shop Manager**
- MCP-compatible client (Claude Desktop, Claude Code, custom)

---

## Εγκατάσταση

```bash
git clone https://github.com/akontaksis/woo-mcp-server.git
cd woo-mcp-server
npm install
```

---

## Setup σε νέο υπολογιστή (από μηδέν)

Αν στήνεις το repo σε καινούργιο μηχάνημα, ακολούθησε αυτή τη ροή.

### Προαπαιτούμενα (εγκατάσταση μία φορά)

**1. Node.js 18+**

```bash
node --version    # θα πρέπει να βγάλει v18.x.x ή νεότερο
```

Αν δεν υπάρχει: κατέβασε από [nodejs.org](https://nodejs.org) → **LTS version**. Σε Windows χρησιμοποίησε τον installer. Επανεκκίνησε το τερματικό μετά την εγκατάσταση.

**2. Git**

```bash
git --version
```

Αν δεν υπάρχει: [git-scm.com/downloads](https://git-scm.com/downloads).

**3. (Προαιρετικά) Claude Desktop ή Claude Code**

Μόνο αν θέλεις να συνδέσεις τον MCP server με AI client. Για να τρέξει απλά το test suite δε χρειάζεται.

### Βήματα setup

```bash
# 1. Clone το repo
git clone https://github.com/akontaksis/woo-mcp-server.git
cd woo-mcp-server

# 2. Εγκατάσταση dependencies (παίρνει ~30 δευτ.)
npm install

# 3. Δημιούργησε τον φάκελο sites/ — δεν έρχεται από git
mkdir sites

# 4. Δημιούργησε το αρχείο sites/capitano.env με τα credentials
#    (βλ. παρακάτω «Μεταφορά secrets»)

# 5. Επαλήθευση ότι όλα δουλεύουν
node test.js
```

Αναμενόμενο output στο τέλος: `22 passed, 0 failed`. Αν αυτό βγει, όλα έτοιμα.

### Μεταφορά secrets

Το αρχείο `sites/capitano.env` **δεν είναι στο git** και δεν πρέπει να μπει ποτέ. Πρέπει να το μεταφέρεις χειροκίνητα από τον αρχικό υπολογιστή.

**Περιεχόμενο που μεταφέρεις** (παράδειγμα):

```env
WC_URL=https://shop.capitanolemnos.gr
WC_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WC_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SITE_NAME=Capitano Lemnos
```

**Ασφαλείς τρόποι μεταφοράς**:

- **Password manager** (1Password, Bitwarden) — αποθήκευσέ το ως «secure note»
- **USB stick** με κρυπτογράφηση
- **scp** μέσω SSH αν έχεις πρόσβαση και στους δύο υπολογιστές
- **Encrypted notes app** (Standard Notes, Joplin με encryption)

**Μη ασφαλείς τρόποι (ΑΠΟΦΥΓΕ)**:

- Email
- Slack, Teams, Messenger, WhatsApp
- Google Drive / Dropbox σε public ή shared folder
- Pastebin, public Gist
- Commit στο git (το `.gitignore` το αποτρέπει, αλλά κάνε **always** `git status` πριν το commit για επαλήθευση)

---

## Ρύθμιση

### 1. Δημιουργία WooCommerce API Keys

Στο WordPress admin του store:

1. **WooCommerce → Settings → Advanced → REST API**
2. **Add key**
3. Συμπλήρωσε:
   - **Description**: π.χ. `MCP Server`
   - **User**: επίλεξε χρήστη με ρόλο **Administrator** ή **Shop Manager** (διαφορετικά τα coupons και άλλα protected endpoints θα γυρνούν 403)
   - **Permissions**: `Read` (αρκεί για όλα τα τρέχοντα tools — όλα read-only)
4. **Generate API key**
5. Αντίγραψε **Consumer key** (`ck_...`) και **Consumer secret** (`cs_...`). Δε θα ξανα-εμφανιστούν.

### 2. Δημιουργία αρχείου site .env

Στον φάκελο `sites/`, φτιάξε ένα αρχείο `<site-name>.env` (π.χ. `capitano.env`):

```env
WC_URL=https://shop.example.com
WC_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WC_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SITE_NAME=My Store Display Name
```

| Μεταβλητή | Τι είναι |
|---|---|
| `WC_URL` | Το base URL του store **χωρίς trailing slash** (π.χ. `https://shop.example.com`, όχι `https://shop.example.com/`) |
| `WC_KEY` | Το consumer key από το βήμα 1 |
| `WC_SECRET` | Το consumer secret |
| `SITE_NAME` | Φιλικό όνομα που εμφανίζεται στο MCP client |

> **Σημαντικό:** Ο φάκελος `sites/` είναι στο `.gitignore`. **Μην** τον κάνεις commit ποτέ — περιέχει credentials με access στο WooCommerce store σου.

### 3. Κρίσιμες ρυθμίσεις WooCommerce

Πριν δοκιμάσεις τα tools, βεβαιώσου ότι αυτές οι ρυθμίσεις είναι σωστές στο WooCommerce store:

#### Enable coupons (κρίσιμο για τα coupon tools)

**WooCommerce → Settings → General → "Enable the use of coupon codes"** πρέπει να είναι **τσεκαρισμένο**.

Όταν είναι disabled, το REST API endpoint `/wp-json/wc/v3/coupons` επιστρέφει **403 Forbidden** ακόμη και σε Administrator user — και τα tools `get_coupons`, `get_coupon_by_code`, `get_expiring_coupons` δε θα δουλεύουν.

#### Permalinks

**Settings → Permalinks** → οποιαδήποτε επιλογή εκτός από `Plain`. Το `Plain` σπάει το REST API.

#### WooCommerce Analytics (απαιτείται για `get_top_customers`)

Τα Analytics είναι ενεργοποιημένα by default σε WooCommerce 4.0+. Αν για κάποιο λόγο τα έχεις απενεργοποιήσει, ενεργοποίησέ τα ξανά:
**WooCommerce → Settings → Advanced → Features → Analytics**.

---

## Multi-site Support

Το repo υποστηρίζει **πολλαπλά WooCommerce stores** μέσω ξεχωριστών `.env` αρχείων στον φάκελο `sites/`:

```
sites/
├── capitano.env       (περιέχει capitano store credentials)
├── store-b.env        (άλλο store)
└── store-c.env        (άλλο store)
```

Επιλογή store γίνεται μέσω της μεταβλητής περιβάλλοντος `SITE`:

```bash
SITE=capitano node index.js
SITE=store-b node index.js
```

Default `SITE` είναι `capitano` (αν δεν οριστεί). Ορίζεται στο [index.js:17](index.js#L17).

---

## Χρήση

### Με Claude Desktop

Επεξεργάσου το config file του Claude Desktop:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Πρόσθεσε:

```json
{
  "mcpServers": {
    "woo-capitano": {
      "command": "node",
      "args": ["C:/Dev/woo-mcp-server/index.js"],
      "env": {
        "SITE": "capitano"
      }
    }
  }
}
```

Για πολλά sites, κάνε ξεχωριστή εγγραφή ανά site:

```json
{
  "mcpServers": {
    "woo-capitano": {
      "command": "node",
      "args": ["C:/Dev/woo-mcp-server/index.js"],
      "env": { "SITE": "capitano" }
    },
    "woo-storeB": {
      "command": "node",
      "args": ["C:/Dev/woo-mcp-server/index.js"],
      "env": { "SITE": "store-b" }
    }
  }
}
```

Επανεκκίνησε το Claude Desktop και κάνε ερωτήσεις τύπου:

> *"Δείξε μου τις τελευταίες 5 παραγγελίες από το capitano"*
> *"Πόσα προϊόντα είναι out of stock;"*
> *"Ποιοι είναι οι top 3 πελάτες;"*

### Με Claude Code

Από το command line, στον φάκελο του project:

```bash
claude mcp add woo-capitano node C:/Dev/woo-mcp-server/index.js
```

ή πρόσθεσε στο `.claude/settings.json` του project:

```json
{
  "mcpServers": {
    "woo-capitano": {
      "command": "node",
      "args": ["C:/Dev/woo-mcp-server/index.js"],
      "env": { "SITE": "capitano" }
    }
  }
}
```

### Έλεγχος μέσω test suite

Πριν συνδέσεις σε MCP client, τρέξε το test suite για να επιβεβαιώσεις ότι όλα τα WC endpoints είναι προσβάσιμα:

```bash
node test.js                    # χρησιμοποιεί SITE=capitano (default)
SITE=store-b node test.js       # ελέγχει διαφορετικό store
```

Αναμενόμενο output: `22 passed, 0 failed`. Αν αποτύχει κάτι, δες το [Troubleshooting](#troubleshooting).

---

## Tools Reference

Όλα τα tool descriptions είναι στα ελληνικά και κατευθύνουν τον AI assistant **πότε να τα χρησιμοποιήσει** και **πότε όχι**.

### Orders

#### `get_orders`

Λίστα παραγγελιών με filters και αυτόματη σύνοψη (συνολικά έσοδα, μέση παραγγελία, κατανομή ανά status).

**Παράμετροι**:
- `status` — `pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`, `any`
- `per_page` — default 10, max 100
- `search` — αναζήτηση με όνομα/email/αριθμό παραγγελίας
- `customer` — WP user ID
- `after`, `before` — ημερομηνίες σε ISO 8601

**Παράδειγμα output**:
```json
{
  "summary": {
    "count": 5,
    "total_revenue": "€1.234,56",
    "average_order": "€246,91",
    "by_status": { "Ολοκληρωμένη": 3, "Σε επεξεργασία": 2 }
  },
  "orders": [...]
}
```

#### `get_order_by_id`

Λεπτομέρειες παραγγελίας με items, διευθύνσεις, μέθοδο πληρωμής/αποστολής, breakdown συνόλων.

**Παράμετροι**: `id` (required)

### Products

#### `get_products`

Λίστα προϊόντων με filters.

**Παράμετροι**: `search`, `category`, `status`, `stock_status`, `on_sale`, `per_page`

#### `get_product_by_id`

Λεπτομέρειες προϊόντος. Επιστρέφει summary, όχι το πλήρες WC object (ο raw object έχει εκατοντάδες πεδία).

#### `get_low_stock_products`

Σαρώνει **όλο** το instock catalog (με pagination, όχι μόνο τα πρώτα N) και επιστρέφει όσα έχουν `stock_quantity ≤ threshold`.

**Παράμετροι**: `threshold` (default 5)

#### `get_product_categories`

Όλες οι κατηγορίες ταξινομημένες κατά αριθμό προϊόντων (descending).

### Customers

#### `get_customers`

Λίστα εγγεγραμμένων πελατών (registered users). **Δεν** επιστρέφει `total_spent`/`orders_count` — γι' αυτά χρησιμοποίησε `get_top_customers` ή `get_customer_by_id`.

#### `get_customer_by_id`

Προφίλ πελάτη με **computed stats** από τις παραγγελίες του (όχι από τα stale πεδία του `customers` endpoint, που σε νέες εκδόσεις WC γυρνάνε `undefined`).

#### `get_top_customers`

Top spenders μέσω **WooCommerce Analytics endpoint** (`wc-analytics/customers`). Επιστρέφει μόνο πελάτες που έχουν κάνει παραγγελίες, με `total_spend`, `orders_count`, `avg_order_value`, `date_last_order`.

### Coupons

#### `get_coupons`

Λίστα κουπονιών με expiry status.

**Παράμετροι**: `search`, `per_page`, `active_only` (αν `true`, κρύβει τα ληγμένα)

#### `get_coupon_by_code`

Πλήρεις λεπτομέρειες κουπονιού (περιορισμοί, products, emails, usage).

#### `get_expiring_coupons`

Κουπόνια που λήγουν μέσα σε X ημέρες (default 30), ταξινομημένα κατά ημερομηνία λήξης.

### Reports

Wrappers γύρω από τα WC reports endpoints. Τα `_totals` endpoints επιστρέφουν all-time counts, όχι ανά περίοδο.

---

## Δομή Project

```
woo-mcp-server/
├── index.js                MCP server entry point + tool registration
├── lib/
│   ├── woocommerce.js      WC REST client (wc/v3 + wc-analytics)
│   └── format.js           Currency, date, status translation helpers
├── tools/
│   ├── orders.js           Order tools
│   ├── products.js         Product tools
│   ├── customers.js        Customer tools
│   ├── coupons.js          Coupon tools
│   └── reports.js          Report tools
├── sites/                  (gitignored) per-site .env credentials
│   └── capitano.env
├── test.js                 Test suite (22 tests)
├── package.json
└── README.md
```

---

## Troubleshooting

### `403 Forbidden` στα coupons

**Αιτία**: Πιθανότατα δεν είναι ενεργοποιημένο το `Enable the use of coupon codes` στο **WooCommerce → Settings → General**. Ενεργοποίησέ το.

Άλλες αιτίες:
- API key user δεν έχει role Administrator/Shop Manager
- Plugin που στερεί το `read_private_shop_coupons` capability (π.χ. role manager plugins, custom code snippets)

Για να επιβεβαιώσεις πού φταίει, τρέξε:

```bash
curl -u "$WC_KEY:$WC_SECRET" "$WC_URL/wp-json/wc/v3/system_status?per_page=1"
curl -u "$WC_KEY:$WC_SECRET" "$WC_URL/wp-json/wc/v3/coupons?per_page=1"
```

Αν το πρώτο δουλεύει και το δεύτερο όχι, το πρόβλημα είναι ειδικά στο coupons (capability ή Enable coupons setting).

### `401 Unauthorized`

API key λάθος, λήγμένο, ή έχει σβηστεί. Επιβεβαίωσε στο **WooCommerce → Settings → Advanced → REST API** ότι το key υπάρχει και είναι ενεργό. Αν είσαι σε σύστημα με rewrite issues, δοκίμασε query-string auth:

```
https://shop.example.com/wp-json/wc/v3/orders?consumer_key=ck_...&consumer_secret=cs_...
```

### `400 Bad Request` στο `get_top_customers`

Το `wc/v3/customers` endpoint **δεν δέχεται** `orderby=total_spent` — αυτό το πεδίο έχει αφαιρεθεί από νέες εκδόσεις WC. Το tool χρησιμοποιεί ήδη τον σωστό δρόμο μέσω `wc-analytics/customers`. Αν παρ' όλα αυτά πέφτει σε 400, βεβαιώσου ότι το **WooCommerce Analytics feature** είναι ενεργοποιημένο (**Settings → Advanced → Features**).

### Το MCP server δε φαίνεται στο Claude Desktop

1. Επιβεβαίωσε ότι το `claude_desktop_config.json` είναι έγκυρο JSON (no trailing commas, σωστά quotes)
2. Επανεκκίνησε **πλήρως** το Claude Desktop (όχι μόνο το παράθυρο)
3. Ελεγξε τα logs:
   - Windows: `%APPDATA%\Claude\logs\mcp-server-<name>.log`
   - macOS: `~/Library/Logs/Claude/mcp-server-<name>.log`
4. Δοκίμασε να τρέξεις χειροκίνητα: `node C:/path/to/index.js` — αν crashάρει, θα δεις το error

### `WC API error 5xx`

Server-side σφάλμα στο WooCommerce. Δες τα WP debug logs (`wp-content/debug.log`) και τα server error logs. Συχνές αιτίες:
- PHP memory limit
- Plugin conflict
- Slow queries σε μεγάλο catalog/orders dataset

---

## Επέκταση

### Πώς να προσθέσεις νέο tool

1. Επίλεξε το κατάλληλο αρχείο στο `tools/` ή φτιάξε νέο
2. Πρόσθεσε `server.tool(name, description, schema, handler)`
3. Αν είναι σε νέο αρχείο, register το στο `index.js`
4. Πρόσθεσε αντίστοιχο test στο `test.js`

**Template**:

```js
import { z } from 'zod';
import { formatPrice } from '../lib/format.js';

server.tool(
    'my_new_tool',
    'Καθαρή περιγραφή που λέει τι κάνει, ΠΟΤΕ να χρησιμοποιηθεί, και ΟΧΙ-πότε.',
    {
        param: z.string().describe('Επεξήγηση παραμέτρου')
    },
    async ({ param }) => {
        const data = await wc(`some-endpoint?x=${param}`);
        return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        };
    }
);
```

### Tips για καλά tool descriptions

Το Claude επιλέγει tool βάσει description. Καλό description περιέχει:
1. **Τι κάνει** σε μια πρόταση
2. **Πότε να χρησιμοποιηθεί** (παραδείγματα ερωτήσεων χρήστη)
3. **Πότε ΟΧΙ** (παραπομπή σε άλλο tool)

### Νέο namespace endpoint

Αν χρειαστείς endpoint εκτός `wc/v3` και `wc-analytics`, επέκτεινε το [lib/woocommerce.js](lib/woocommerce.js):

```js
wc.myNamespace = (endpoint, options) => request('my-namespace/v1', endpoint, options);
```

---

## Διαφορές vs Smart AI Chatbot

Αν χρησιμοποιείς και το **Smart AI Chatbot** WordPress plugin που έχει δικό του function calling για WooCommerce, οι διαφορές:

| | Smart AI Chatbot | Αυτό το MCP server |
|---|---|---|
| **Πού τρέχει** | Στον WP server | Σε client machine (stdio) |
| **Ποιος το χρησιμοποιεί** | Επισκέπτες της σελίδας | Εσύ μέσω Claude Desktop/Code |
| **Read/Write** | Read + Write (limited) | Read-only (για τώρα) |
| **Customization** | Plugin admin UI | Code-level |

Τα δύο **δεν συγκρούονται** — μπορούν να συνυπάρχουν. Διαφορετικά use cases (front-end customers vs back-end admins).

---

## License

ISC

---

## Author

Athanasios Kontaksis
