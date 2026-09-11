import * as crypto from 'crypto'

import {
  createSepayHmac,
  verifySepayWebhookSignature,
} from '@domain/utils/sepay-signature.util'

describe('SePay Webhook Signature Verification', () => {
  const secret = 'whsec_test_secret_key_12345'
  const payload = {
    id: 12345,
    transferType: 'in',
    transferAmount: 250000,
    content: 'DH-123456 THANH TOAN',
    gateway: 'MBBank',
  }
  const rawBody = JSON.stringify(payload)

  it('should generate valid HMAC-SHA256 hex', () => {
    const hmac = createSepayHmac(secret, rawBody)
    expect(typeof hmac).toBe('string')
    expect(hmac.length).toBe(64)
  })

  it('should verify valid HMAC-SHA256 hex signature in x-sepay-signature', () => {
    const hmac = createSepayHmac(secret, rawBody)
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
      signature: hmac,
    })
    expect(isValid).toBe(true)
  })

  it('should verify valid HMAC-SHA256 base64 signature in x-signature', () => {
    const base64Sig = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64')
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
      xSignature: base64Sig,
    })
    expect(isValid).toBe(true)
  })

  it('should verify valid Authorization: Apikey <secret>', () => {
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
      authorization: `Apikey ${secret}`,
    })
    expect(isValid).toBe(true)
  })

  it('should verify valid Authorization: Bearer <secret>', () => {
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
      authorization: `Bearer ${secret}`,
    })
    expect(isValid).toBe(true)
  })

  it('should reject invalid signature', () => {
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
      signature:
        'invalid_fake_hmac_signature_value_1234567890abcdef1234567890abcdef',
    })
    expect(isValid).toBe(false)
  })

  it('should reject when signature is missing but secret is required', () => {
    const isValid = verifySepayWebhookSignature({
      secret,
      rawBody,
      payload,
    })
    expect(isValid).toBe(false)
  })
})
