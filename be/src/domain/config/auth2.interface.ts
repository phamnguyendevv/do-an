export interface IAuth2Config {
  getGoogleClientId(): string
  getGoogleClientSecret(): string
  getClientUrl(): string
}
