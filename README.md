# n8n-nodes-dealerai

An n8n community node for the DealerAI production API. It provides 57 operations across 17 resources, including contacts, conversations, dealership configuration, inventory, personnel, promotions, search, and sequence enrollment.

## Installation

Install `n8n-nodes-dealerai` from **Settings > Community Nodes** in a self-hosted n8n instance, or install it with npm:

```bash
npm install n8n-nodes-dealerai
```

## Credentials

Create a **DealerAI API** credential with:

- **Base URL**: Defaults to `https://api.dealerai.com`.
- **Username** and **Password**: DealerAI HTTP Basic authentication credentials.

The credential test calls `POST /api/v1/authentication/verify`.

## Usage

1. Add a **DealerAI** node to a workflow.
2. Select your **DealerAI API** credential.
3. Select a resource and operation, then provide the required fields.
4. Add optional query and request-body values under **Additional Fields**.

Successful requests return the DealerAI response under `data`, together with the HTTP `statusCode`, optional `statusMessage`, and response `headers`. Successful delete operations return `{ "deleted": true }` so downstream nodes receive a confirmation item.

### Example: keep website promotions synchronized

This pattern is based on an existing DealerAI promotion-extraction workflow:

1. Start with a **Manual Trigger** or scheduled trigger.
2. Scrape the dealership's promotion listing page and split the discovered promotion URLs into items.
3. Scrape each promotion detail page to produce HTML and Markdown.
4. Add a **DealerAI** node with:
   - **Resource**: `Promotion`
   - **Operation**: `Extract and Create a Promotion`
   - **Force**: `true`
   - **HTML**: `={{ $json.data.html }}`
   - **Is Active**: `true`
   - **Markdown**: `={{ $json.data.markdown }}`
   - **Overwrite**: `true`
   - **Site URL**: an expression that reads the current promotion detail URL
5. Add another **DealerAI** node with **Promotion > Get Promotions**. Set **Is Active** and **Is Extracted** to `true` to retrieve the existing active extracted promotions.
6. Compare the existing promotion URLs with the URLs discovered by the scraper.
7. For promotions no longer present on the website, use **Promotion > Set Promotion Active Status**, set **ID** from the comparison result, and set **Active** to `false`.

The DealerAI API credential supplies authentication to every DealerAI node, so the workflow does not need to place usernames or passwords in node parameters.

## API coverage

The package exposes 57 operations across 17 DealerAI resources:

- AILM
- Authentication
- Contacts
- Conversation
- Credit App Webhook
- Dealership
- Dealership Hours
- Dealership Knowledge Base
- Manufacturer
- New Inventory
- Personnel
- Promotion
- Search
- Sequence Enrollments
- Train LLM
- Used Inventory
- Version

Optional query and request-body properties appear under **Additional Fields**. The node supports JSON and XML bodies, multipart inventory uploads, configurable request timeouts, item linking, and structured DealerAI API errors.

## Development

```bash
npm ci
npm run lint
npm run build
```

The npm package contains only the compiled `dist` directory and the standard package metadata, README, and license files.

## Support

Report problems through [GitHub Issues](https://github.com/dealerai/n8n-nodes-dealerai/issues).

## License

[MIT](LICENSE)
