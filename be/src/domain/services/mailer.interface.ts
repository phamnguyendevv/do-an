export const MAILER_SERVICE = 'MAILER_SERVICE_INTERFACE'

export interface IMailerService {
  sendMail(to: string, subject: string, text?: string): Promise<void>
}
