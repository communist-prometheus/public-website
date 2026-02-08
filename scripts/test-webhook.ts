/// <reference types="bun" />

interface WebhookPayload {
  readonly repository: string;
  readonly branch: string;
  readonly filePath: string;
  readonly content: string;
  readonly message: string;
}

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

const testWebhook = async (): Promise<void> => {
  const webhookUrl = Bun.env.WEBHOOK_URL ?? 'http://localhost:8788/api/webhook';
  const secret = Bun.env.WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('WEBHOOK_SECRET environment variable is required');
  }

  const payload: WebhookPayload = {
    repository: 'your-org/public-website',
    branch: 'main',
    filePath: 'test/webhook-test.md',
    content: `# Webhook Test\n\nGenerated at: ${new Date().toISOString()}`,
    message: 'test: webhook functionality'
  };

  const body = JSON.stringify(payload);
  const signature = await generateSignature(body, secret);

  console.log('Testing webhook...');
  console.log('URL:', webhookUrl);
  console.log('Payload:', payload);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      },
      body
    });

    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.error('\n❌ Webhook test failed!');
      throw new Error('Webhook test failed');
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
    throw error;
  }
};

await testWebhook();

export {};
