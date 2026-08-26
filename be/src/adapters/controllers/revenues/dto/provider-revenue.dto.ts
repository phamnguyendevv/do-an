import { OmitType } from '@nestjs/swagger';
import { RevenueFilterDto } from './revenue-filter.dto';

export class ProviderRevenueDto extends OmitType(
  RevenueFilterDto,
  ['serviceId', 'paymentStatus'] as const,
) {
}
