import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EXCEPTIONS } from '@domain/exceptions/exceptions.interface'
import { TASK_REPOSITORY } from '@domain/repositories/task.repository.interface'

import { CountTasksUseCase } from '@use-cases/tasks/count-tasks.use-case'
import { CreateTaskUseCase } from '@use-cases/tasks/create-task.use-case'
import { GetDetailTaskUseCase } from '@use-cases/tasks/get-detail-task.use-case'
import { GetListTasksUseCase } from '@use-cases/tasks/get-list-tasks.use-case'
import { UpdateTaskUseCase } from '@use-cases/tasks/update-task.use-case'

import { TaskRepository } from '@infrastructure/databases/postgressql/repositories/task.repository'
import { ExceptionsService } from '@infrastructure/exceptions/exceptions.service'
import { CaslModule } from '@infrastructure/services/casl/casl.module'

import { TasksController } from '../adapters/controllers/tasks/tasks.controller'
import { Task } from '../infrastructure/databases/postgressql/entities/task.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Task]), CaslModule],
  controllers: [TasksController],
  providers: [
    {
      provide: TASK_REPOSITORY,
      useClass: TaskRepository,
    },
    {
      provide: EXCEPTIONS,
      useClass: ExceptionsService,
    },

    CountTasksUseCase,
    GetListTasksUseCase,
    CreateTaskUseCase,
    GetDetailTaskUseCase,
    UpdateTaskUseCase,
  ],
})
export class TasksModule {}
