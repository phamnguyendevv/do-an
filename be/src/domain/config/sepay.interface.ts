export interface ISepayConfig {
  getSepayBank(): string
  getSepayAccount(): string
  getSepayAccountName(): string
  getSepayWebhookSecret(): string
}
