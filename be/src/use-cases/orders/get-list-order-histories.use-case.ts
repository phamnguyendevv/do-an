import { Inject, Injectable } from '@nestjs/common'

import { OrderHistoryEntity } from '@domain/entities/order-history.entity'
import { IPaginationParams } from '@domain/entities/search.entity'
import {
  IOrderHistoryRepositoryInterface,
  ISearchOrderHistoryParams,
  ORDER_HISTORY_REPOSITORY,
} from '@domain/repositories/order-history.repository.interface'

@Injectable()
export class GetListOrderHistoriesUseCase {
  constructor(
    @Inject(ORDER_HISTORY_REPOSITORY)
    private readonly historyRepository: IOrderHistoryRepositoryInterface,
  ) {}

  async execute(params: ISearchOrderHistoryParams): Promise<{
    data: OrderHistoryEntity[]
    pagination: IPaginationParams
  }> {
    return await this.historyRepository.findHistories(params)
  }
}
