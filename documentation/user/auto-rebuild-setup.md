# Auto-Rebuild Setup for Prometheus Public Website

## Architecture Overview

The system enables automatic site rebuilds when content is updated through an external application:

```
External App → Webhook → GitHub API → Cloudflare Pages → Rebuild
```

## Components

### 1. Cloudflare Pages
- Hosts the static Astro site
- Automatically rebuilds on Git push
- Free tier: 500 builds/month

### 2. Webhook Endpoint
Location: `/functions/api/webhook.ts`

Receives content updates and commits them to the repository, triggering automatic rebuild.

## Deployment

### Initial Setup

1. **Install dependencies:**
```bash
bun install
```

2. **Configure Cloudflare Pages:**
   - Connect GitHub repository to Cloudflare Pages
   - Set build command: `bun run build`
   - Set output directory: `dist`
   - Add environment variables:
     - `GITHUB_TOKEN`: GitHub Personal Access Token with `repo` scope
     - `WEBHOOK_SECRET`: Random secret for webhook validation

3. **Deploy:**
```bash
bun run pages:deploy
```

### Local Development

1. **Create `.dev.vars` file:**
```bash
GITHUB_TOKEN=ghp_your_token_here
WEBHOOK_SECRET=your_random_secret_here
```

2. **Build and preview:**
```bash
bun run build
bun run pages:dev
```

## Webhook API

### Endpoint
```
POST /api/webhook
```

### Headers
```
x-webhook-signature: HMAC-SHA256 signature of request body
Content-Type: application/json
```

### Request Body
```typescript
{
  "repository": "owner/repo-name",
  "branch": "main",
  "filePath": "src/content/posts/my-post.md",
  "content": "# My Post\n\nContent here...",
  "message": "Update: My Post"
}
```

### Response
```typescript
{
  "success": true,
  "commit": {
    "sha": "abc123...",
    "url": "https://github.com/..."
  }
}
```

## Security

### Webhook Signature Validation

Generate signature in your external app:
```typescript
const generateSignature = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const signature = await generateSignature(
  JSON.stringify(requestBody),
  process.env.WEBHOOK_SECRET!
);

// Add to request headers
headers['x-webhook-signature'] = signature;
```

### GitHub Token Permissions

Required scopes:
- `repo` - Full control of private repositories
- Or `public_repo` - Access public repositories

## Alternative: Content in Cloudflare KV/D1

For instant updates without Git commits, consider migrating to SSR:

1. Store content in Cloudflare KV/D1/R2
2. Switch Astro to SSR mode (`output: 'server'`)
3. Fetch content at request time
4. Use Cloudflare Cache API for performance

### Trade-offs

**Git-based (current):**
- ✅ Version control for content
- ✅ Simple rollback
- ✅ Free (up to 500 builds/month)
- ❌ Slower updates (build time ~1-5 min)

**KV/D1-based:**
- ✅ Instant updates
- ✅ No build required
- ❌ No version history
- ❌ Higher cost (KV reads + compute)
- ❌ More complex architecture

## Monitoring

### Build Status
Check Cloudflare Pages dashboard for:
- Build success/failure
- Deploy previews
- Analytics

### Webhook Logs
View in Cloudflare Workers dashboard:
- Request logs
- Error traces
- Performance metrics

## Troubleshooting

### Build Failures
1. Check Cloudflare Pages build logs
2. Verify content format (valid Markdown, frontmatter)
3. Test locally: `bun run build`

### Webhook Errors

**401 Unauthorized:**
- Invalid signature - check `WEBHOOK_SECRET` matches

**400 Bad Request:**
- Missing required fields in payload
- Verify JSON structure

**500 GitHub API Error:**
- Check `GITHUB_TOKEN` is valid
- Verify repository access permissions
- Check file path is correct

## Example: External App Integration

```typescript
// content-updater.ts
interface UpdateContentParams {
  filePath: string;
  content: string;
  message: string;
}

const updateContent = async (params: UpdateContentParams): Promise<void> => {
  const payload = {
    repository: 'your-org/public-website',
    branch: 'main',
    filePath: params.filePath,
    content: params.content,
    message: params.message
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, process.env.WEBHOOK_SECRET!);

  const response = await fetch('https://your-site.pages.dev/api/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${await response.text()}`);
  }

  const result = await response.json();
  console.log('Content updated:', result.commit.sha);
};

// Usage
await updateContent({
  filePath: 'src/content/blog/new-post.md',
  content: '# New Post\n\nHello world!',
  message: 'feat: add new blog post'
});
```

## Next Steps

Consider implementing:
1. **Incremental Static Regeneration** - Rebuild only changed pages
2. **Build Queue** - Batch multiple updates before rebuilding
3. **Preview Deployments** - Test content before production
4. **Content Validation** - Verify Markdown/frontmatter before committing
