/// <reference types="@cloudflare/workers-types" />

interface Env {
  readonly GITHUB_TOKEN: string;
  readonly WEBHOOK_SECRET: string;
}

interface PagesContext {
  readonly request: Request;
  readonly env: Env;
  readonly waitUntil: (promise: Promise<unknown>) => void;
  readonly next: () => Promise<Response>;
  readonly params: Record<string, string>;
}

interface ContentUpdatePayload {
  readonly repository: string;
  readonly branch: string;
  readonly filePath: string;
  readonly content: string;
  readonly message: string;
}

const validateWebhookSignature = async (
  request: Request,
  secret: string
): Promise<boolean> => {
  const signature = request.headers.get('x-webhook-signature');
  if (!signature) return false;

  const body = await request.clone().text();
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, data);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
};

const updateGitHubFile = async (
  payload: ContentUpdatePayload,
  token: string
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> => {
  const [owner, repo] = payload.repository.split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${payload.filePath}`;

  const getResponse = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cloudflare-Worker'
    }
  });

  let sha: string | undefined;
  if (getResponse.ok) {
    const fileData = await getResponse.json() as { sha: string };
    sha = fileData.sha;
  }

  return await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker'
    },
    body: JSON.stringify({
      message: payload.message,
      content: btoa(payload.content),
      branch: payload.branch,
      ...(sha && { sha })
    })
  });
};

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  try {
    const isValid = await validateWebhookSignature(request, env.WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = await request.json() as ContentUpdatePayload;

    if (!payload.repository || !payload.filePath || !payload.content) {
      return new Response('Invalid payload', { status: 400 });
    }

    const updateResponse = await updateGitHubFile(payload, env.GITHUB_TOKEN);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('GitHub API error:', errorText);
      return new Response(`GitHub API error: ${errorText}`, { 
        status: updateResponse.status 
      });
    }

    const result = await updateResponse.json();
    return new Response(JSON.stringify({ 
      success: true, 
      commit: result 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
