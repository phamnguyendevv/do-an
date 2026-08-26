import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CreateReviewUseCase } from '@use-cases/reviews/create-review.use-case'
import { DeleteReviewUseCase } from '@use-cases/reviews/delete-review.use-case'
import { GetDetailReviewUseCase } from '@use-cases/reviews/get-detail-review.use-case'
import { GetListReviewUseCase } from '@use-cases/reviews/get-list-review.use-case'
import { UpdateReviewUseCase } from '@use-cases/reviews/update-review.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import { ApiResponseType } from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CreateReviewDto } from './dto/create-review.dto'
import { GetListReviewsDto } from './dto/get-list-reviews.dto'
import { UpdateReviewDto } from './dto/update-review.dto'
import { CreateReviewPresenter } from './presenters/create-review.presenter'
import { GetDetailReviewPresenter } from './presenters/get-detail-review.presenter'
import {
  GetListReviewsPresenter,
  ReviewsPresenter,
} from './presenters/get-list-review.presenter'

@Controller()
@ApiTags('Reviews')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiExtraModels(
  GetListReviewsPresenter,
  GetDetailReviewPresenter,
  CreateReviewPresenter,
)
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ReviewsController {
  constructor(
    private readonly getReviewsUseCase: GetListReviewUseCase,
    private readonly createReviewUseCase: CreateReviewUseCase,
    private readonly updateReviewUseCase: UpdateReviewUseCase,
    private readonly deleteReviewUseCase: DeleteReviewUseCase,
    private readonly getDetailReviewUseCase: GetDetailReviewUseCase,
  ) {}

  @Get('/reviews/search')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get reviews',
    description: 'Retrieve a list of public reviews',
  })
  @CheckPolicies({ action: 'read', subject: 'Review' })
  @ApiResponseType(GetListReviewsPresenter, true)
  async getReviews(@Query() queryParams: GetListReviewsDto) {
    const { data, pagination } =
      await this.getReviewsUseCase.execute(queryParams)
    return new GetListReviewsPresenter(
      data.map((review) => new ReviewsPresenter(review)),
      pagination,
    )
  }

  @Get('/users/reviews/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponseType(GetDetailReviewPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Review' })
  async getReviewById(@Param('id', ParseIntPipe) id: number) {
    const review = await this.getDetailReviewUseCase.execute({
      id,
    })
    return new GetDetailReviewPresenter(review)
  }

  @Post('/users/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponseType(CreateReviewPresenter, true)
  @CheckPolicies({ action: 'create', subject: 'Review' })
  async createReview(
    @Body() createReviewDto: CreateReviewDto,
    @User('id') userId: number,
  ) {
    const review = await this.createReviewUseCase.execute(
      createReviewDto,
      userId,
    )
    return new CreateReviewPresenter(review)
  }

  @Put('/users/reviews/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing review' })
  @CheckPolicies({ action: 'update', subject: 'Review' })
  async updateReview(
    @Body() updateReviewData: UpdateReviewDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const updatedReview = await this.updateReviewUseCase.execute(
      { id },
      updateReviewData,
    )
    return updatedReview
  }

  @Delete('/users/reviews/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  @CheckPolicies({ action: 'delete', subject: 'Review' })
  async deleteReview(@Param('id') id: number): Promise<boolean> {
    const isDeleted = await this.deleteReviewUseCase.execute({
      id,
    })

    return isDeleted
  }
}
