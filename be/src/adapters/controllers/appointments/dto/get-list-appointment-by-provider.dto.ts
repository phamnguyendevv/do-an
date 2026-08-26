import { OmitType } from '@nestjs/swagger'

import { GetListAppointmentDto } from './get-list-appointment.dto'

export class GetListAppointmentByProviderDto extends OmitType(
  GetListAppointmentDto,
  ['providerId'] as const,
) {}
