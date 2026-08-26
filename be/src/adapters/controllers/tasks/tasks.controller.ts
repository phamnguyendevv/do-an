import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CountTasksUseCase } from '@use-cases/tasks/count-tasks.use-case'
import { CreateTaskUseCase } from '@use-cases/tasks/create-task.use-case'
import { GetDetailTaskUseCase } from '@use-cases/tasks/get-detail-task.use-case'
import { GetListTasksUseCase } from '@use-cases/tasks/get-list-tasks.use-case'
import { UpdateTaskUseCase } from '@use-cases/tasks/update-task.use-case'

import { CheckPolicies } from '../common/decorators/check-policies.decorator'
import {
  ApiCreatedResponseType,
  ApiResponseType,
} from '../common/decorators/swagger-response.decorator'
import { User } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PoliciesGuard } from '../common/guards/policies.guard'
import { CountTasksDto } from './dto/count-tasks.dto'
import { CreateTaskDto } from './dto/create-task.dto'
import { GetListTasksDto } from './dto/get-list-tasks.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { CountTasksPresenter } from './presenters/count-tasks.presenter'
import { CreateTaskPresenter } from './presenters/create-tasks.presenter'
import { GetDetailTaskPresenter } from './presenters/get-detail-task.presenter'
import { GetListTasksPresenter } from './presenters/get-list-tasks.presenter'

@Controller('tasks')
@ApiTags('Tasks')
@ApiResponse({
  status: 401,
  description: 'No authorization token was found',
})
@ApiResponse({ status: 500, description: 'Internal error' })
@ApiResponse({ status: 403, description: 'Forbidden access' })
@ApiExtraModels(GetListTasksPresenter)
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class TasksController {
  constructor(
    private readonly getListTasksUseCase: GetListTasksUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getDetailTaskUseCase: GetDetailTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly countTasksUseCase: CountTasksUseCase,
  ) {}

  @Get('count')
  @ApiExtraModels(CountTasksPresenter)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Count', description: 'Count tasks' })
  @ApiResponseType(CountTasksPresenter, false)
  @CheckPolicies({ action: 'read', subject: 'Task' })
  async count(
    @Query() countTaskDto: CountTasksDto,
    @User('id') userId: number,
  ) {
    const count = await this.countTasksUseCase.execute({
      userId: userId,
      ...countTaskDto,
    })

    return new CountTasksPresenter({ count })
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List', description: 'List tasks' })
  @ApiResponseType(GetListTasksPresenter, true)
  @CheckPolicies({ action: 'read', subject: 'Task' })
  async findAll(
    @Query() querySearchParams: GetListTasksDto,
    @User('id') userId: number,
  ) {
    const tasks = await this.getListTasksUseCase.execute({
      ...querySearchParams,
      userId: userId,
    })

    return tasks.map((task) => new GetListTasksPresenter(task))
  }

  @Post()
  @ApiExtraModels(CreateTaskPresenter)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create', description: 'Create a task' })
  @ApiCreatedResponseType(CreateTaskPresenter, false)
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @CheckPolicies({ action: 'create', subject: 'Task' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @User('id') userId: number,
  ) {
    const task = await this.createTaskUseCase.execute({
      ...createTaskDto,
      userId: userId,
    })

    return new CreateTaskPresenter(task)
  }

  @Get(':id')
  @ApiExtraModels(GetDetailTaskPresenter)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detail', description: 'Detail task' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiResponseType(GetDetailTaskPresenter, false)
  @CheckPolicies({ action: 'read', subject: 'Task' })
  async findOne(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const task = await this.getDetailTaskUseCase.execute({
      id: id,
      userId: userId,
    })

    return new GetDetailTaskPresenter(task)
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update', description: 'Update a task' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiOkResponse({ description: 'Task updated' })
  @CheckPolicies({ action: 'update', subject: 'Task' })
  async update(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const isUpdated = await this.updateTaskUseCase.execute(
      {
        id: id,
        userId: userId,
      },
      updateTaskDto,
    )

    return isUpdated
  }
}
