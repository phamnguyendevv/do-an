import { MailerService } from '@nestjs-modules/mailer'
import { Inject, Injectable } from '@nestjs/common'

import { EXCEPTIONS, IException } from '@domain/exceptions/exceptions.interface'
import { IMailerService } from '@domain/services/mailer.interface'

@Injectable()
export class NodeMailerService implements IMailerService {
  constructor(
    private readonly mailService: MailerService,
    @Inject(EXCEPTIONS)
    private readonly exceptionsService: IException,
  ) {}

  async sendMail(to: string, subject: string, text?: string): Promise<void> {
    try {
      await this.mailService.sendMail({
        to,
        subject: subject,
        from: 'BookStock <no-reply@bookstock.vn>',
        text: text,
      })
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn(`[NodeMailerService] Could not send email to ${to}:`, err?.message || err)
      // eslint-disable-next-line no-console
      console.log(`\n========================================\n[DEV OTP] To: ${to} | Subject: ${subject}\n${text}\n========================================\n`)
      if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
        return
      }
      throw this.exceptionsService.internalServerErrorException({
        type: 'InternalServerError',
        message: 'Failed to send email',
      })
    }
  }
}
