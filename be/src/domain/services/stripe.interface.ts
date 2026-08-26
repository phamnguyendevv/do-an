import Stripe from 'stripe'

export const STRIPE_SERVICE = 'STRIPE_SERVICE_INTERFACE'
export const STRIPE_CLIENT = 'STRIPE_CLIENT'
export interface IStripeService {
  createPaymentIntent(params: {
    amount: number
    currency: string
  }): Promise<{ clientSecret: string; paymentIntentId: string }>
  // getPaymentIntent(paymentIntentId: string): Promise<{
  //   id: string
  //   amount: number
  //   currency: string
  //   status: string
  //   isRefunded: boolean
  //   totalRefunded: number
  //   refundDetails: Stripe.Refund[]
  // }>
  constructEventFromPayload(payload: string, signature: string): Stripe.Event
  getSession(sessionId: string): Promise<Stripe.Checkout.Session>
  refundPayment(paymentIntentId: string): Promise<Stripe.Refund>
}
