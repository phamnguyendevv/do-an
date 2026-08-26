export interface INodeMailerConfig {
  getStripeSecretKey(): string
  getStripeWebhookSecret(): string
}
