import * as crypto from 'crypto'

export interface VerifySepaySignatureParams {
  secret: string
  rawBody?: string | Buffer
  payload?: any
  signature?: string
  xSignature?: string
  timestamp?: string | number
  authorization?: string
}

/**
 * Creates HMAC-SHA256 signature from raw data and secret.
 * If timestamp is provided, follows SePay format: `${timestamp}.${data}`
 */
export function createSepayHmac(
  secret: string,
  data: string | Buffer,
  timestamp?: string | number,
): string {
  const content = typeof data === 'string' ? data : data.toString('utf-8')
  const payloadToSign = timestamp ? `${timestamp}.${content}` : content
  return crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex')
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
  timestamp,
  authorization,
}: VerifySepaySignatureParams): boolean {
  const cleanSecret = (secret || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
  if (!cleanSecret) {
    // Standard rule: a webhook secret is required. Without it, every
    // webhook must be rejected instead of being accepted by default.
    return false
  }

  const rawSig = (signature || xSignature || '').trim()
  // SePay sends signature as `sha256={hex}` or `{hex}`
  const cleanSig = rawSig.replace(/^sha256=/i, '').trim()

  // 1. Direct API Key / Secret match via Authorization header (e.g. "Apikey <SECRET>" or "Bearer <SECRET>")
  if (authorization) {
    const trimmedAuth = authorization.trim()
    const cleanAuth = trimmedAuth
      .replace(/^(Apikey|Bearer)\s+/i, '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim()
    if (cleanAuth === cleanSecret || trimmedAuth === cleanSecret) {
      return true
    }
  }

  // 2. Direct secret match via signature header
  if (cleanSig && cleanSig === cleanSecret) {
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

  // SePay HMAC specification: sign `${timestamp}.${raw_body}`
  // Fall back to signing `raw_body` directly if timestamp is not provided
  const payloadsToTry: string[] = []
  if (timestamp) {
    payloadsToTry.push(`${timestamp}.${bodyContent}`)
  }
  payloadsToTry.push(bodyContent)

  // Check against signature header (hex or base64)
  if (cleanSig) {
    for (const dataToSign of payloadsToTry) {
      const expectedHex = crypto
        .createHmac('sha256', cleanSecret)
        .update(dataToSign)
        .digest('hex')
      const expectedBase64 = crypto
        .createHmac('sha256', cleanSecret)
        .update(dataToSign)
        .digest('base64')

      if (cleanSig.length === expectedHex.length) {
        try {
          if (
            crypto.timingSafeEqual(
              Buffer.from(cleanSig, 'utf-8'),
              Buffer.from(expectedHex, 'utf-8'),
            )
          ) {
            return true
          }
        } catch {
          // Safe fail on buffer comparison
        }
      }

      if (cleanSig.length === expectedBase64.length) {
        try {
          if (
            crypto.timingSafeEqual(
              Buffer.from(cleanSig, 'utf-8'),
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
  }

  // Check if authorization header contains computed HMAC
  if (authorization) {
    const cleanAuth = authorization.replace(/^(Apikey|Bearer)\s+/i, '').trim()
    for (const dataToSign of payloadsToTry) {
      const expectedHex = crypto
        .createHmac('sha256', cleanSecret)
        .update(dataToSign)
        .digest('hex')

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
  }

  return false
}

