import { UserRoleEnum } from '@domain/entities/role.entity'
import { UserStatusEnum } from '@domain/entities/status.entity'

import { NotificationsController } from '@adapters/controllers/notifications/notifications.controller'

describe('NotificationsController.create', () => {
  const input = {
    id: 'notice-1',
    title: 'System update',
    description: 'A new system update is available',
    module: 'Dashboard',
    tone: 'info' as const,
  }

  it('limits staff notifications to the acting user', async () => {
    const notificationRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((notification: Record<string, unknown>) => notification),
      save: jest.fn(async (notifications: Record<string, unknown>[]) =>
        notifications.map((notification, index: number) => ({
          ...notification,
          id: `saved-${index}`,
        })),
      ),
    }
    const userRepository = { find: jest.fn() }
    const paymentGateway = { emitNotification: jest.fn() }
    const controller = new NotificationsController(
      notificationRepository as never,
      userRepository as never,
      paymentGateway as never,
    )

    await controller.create(7, UserRoleEnum.Staff, input)

    expect(userRepository.find).not.toHaveBeenCalled()
    expect(notificationRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ actorId: 7 }),
    ])
    expect(paymentGateway.emitNotification).toHaveBeenCalledTimes(1)
  })

  it('allows administrators to broadcast notifications to active users', async () => {
    const notificationRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((notification: Record<string, unknown>) => notification),
      save: jest.fn(async (notifications: Record<string, unknown>[]) =>
        notifications.map((notification, index: number) => ({
          ...notification,
          id: `saved-${index}`,
        })),
      ),
    }
    const userRepository = {
      find: jest.fn().mockResolvedValue([{ id: 7 }, { id: 8 }]),
    }
    const paymentGateway = { emitNotification: jest.fn() }
    const controller = new NotificationsController(
      notificationRepository as never,
      userRepository as never,
      paymentGateway as never,
    )

    await controller.create(7, UserRoleEnum.Admin, input)

    expect(userRepository.find).toHaveBeenCalledWith({
      select: { id: true },
      where: { status: UserStatusEnum.Active },
    })
    expect(notificationRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ actorId: 7 }),
      expect.objectContaining({ actorId: 8 }),
    ])
  })
})
