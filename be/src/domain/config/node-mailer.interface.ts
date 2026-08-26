export interface INodeMailerConfig {
  getHostNodeMailer(): string
  getPortNodeMailer(): number
  getEmailUsername(): string
  getEmailPassword(): string
}
