import { OmitType } from '@nestjs/swagger'

import { GetListAppointmentDto } from './get-list-appointment.dto'

export class GetListAppointmentByUserDto extends OmitType(
  GetListAppointmentDto,
  ['clientId'] as const,
) {}
