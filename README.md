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

## Supported resources

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

Report problems through [GitHub Issues](https://github.com/DealerAI/n8n-nodes-dealerai/issues).

## License

[MIT](LICENSE)
