import * as crypto from 'crypto'

export interface VerifySepaySignatureParams {
  secret: string
  rawBody?: string | Buffer
  payload?: any
  signature?: string
  xSignature?: string
  authorization?: string
}

/**
 * Creates HMAC-SHA256 signature from raw data and secret.
 */
export function createSepayHmac(secret: string, data: string | Buffer): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Verifies the incoming SePay webhook signature using HMAC-SHA256 or direct API Token / Secret.
 */
export function verifySepayWebhookSignature({
  secret,
  rawBody,
  payload,
  signature,
  xSignature,
  authorization,
}: VerifySepaySignatureParams): boolean {
  if (!secret) {
    // If no secret configured, allow (e.g. initial development)
    return true
  }

  const sig = (signature || xSignature || '').trim()

  // 1. Direct API Key / Secret match via Authorization header (e.g. "Apikey <SECRET>" or "Bearer <SECRET>")
  if (authorization) {
    const cleanAuth = authorization.replace(/^(Apikey|Bearer)\s+/i, '').trim()
    if (cleanAuth === secret) {
      return true
    }
  }

  // 2. Direct secret match via signature header
  if (sig && sig === secret) {
    return true
  }

  // 3. HMAC-SHA256 signature verification against raw body or payload
  let bodyContent = ''
  if (rawBody) {
    bodyContent =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8')
  } else if (payload) {
    bodyContent = JSON.stringify(payload)
  }

  if (!bodyContent) {
    return false
  }

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(bodyContent)
    .digest('hex')
  const expectedBase64 = crypto
    .createHmac('sha256', secret)
    .update(bodyContent)
    .digest('base64')

  // Check against signature header (hex or base64)
  if (sig) {
    if (sig.length === expectedHex.length) {
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(sig, 'utf-8'),
            Buffer.from(expectedHex, 'utf-8'),
          )
        ) {
          return true
        }
      } catch {
        // Safe fail on buffer comparison
      }
    }

    if (sig.length === expectedBase64.length) {
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(sig, 'utf-8'),
            Buffer.from(expectedBase64, 'utf-8'),
          )
        ) {
          return true
        }
      } catch {
        // Safe fail on buffer comparison
      }
    }
  }

  // Check if authorization header contains computed HMAC
  if (authorization) {
    const cleanAuth = authorization.replace(/^(Apikey|Bearer)\s+/i, '').trim()
    if (cleanAuth.length === expectedHex.length) {
      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(cleanAuth, 'utf-8'),
            Buffer.from(expectedHex, 'utf-8'),
          )
        ) {
          return true
        }
      } catch {
        /* ignore crypto comparison errors */
      }
    }
  }

  return false
}
