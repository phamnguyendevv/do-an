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
    } catch {
      throw this.exceptionsService.internalServerErrorException({
        type: 'InternalServerError',
        message: 'Failed to send email',
      })
    }
  }
}
