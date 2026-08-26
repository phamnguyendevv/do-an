import { ApiProperty } from '@nestjs/swagger';
import { OrderEntity } from '@domain/entities/order.entity';
import { IPaginationParams } from '@domain/entities/search.entity';

export class GetProviderRevenuePresenter {
  @ApiProperty({
    example: [
      {
        providerId: 1,
        providerName: 'John Doe',
        email: 'john@example.com',
        totalRevenue: 5000,
        totalOrders: 20,
        totalRefunds: 200,
        netRevenue: 4800,
        lastOrderDate: '2025-08-12T00:00:00Z',
        joinDate: '2023-05-10T00:00:00Z',
        currency: 'usd',
      },
    ],
  })
  providers!: {
    providerId: number;
    providerName: string;
    email: string;
    totalRevenue: number;
    totalOrders: number;
    totalRefunds: number;
    netRevenue: number;
    lastOrderDate: string;
    joinDate: string;
    currency: string;
  }[];

  @ApiProperty({
    example: { page: 1, size: 10, total: 50 },
  })
  pagination!: {
    page: number;
    size: number;
    total: number;
  };

  @ApiProperty({
    example: {
      totalRevenue: 100000,
      totalProviders: 10,
      averageRevenuePerProvider: 10000,
      currency: 'usd',
    },
  })
  summary!: {
    totalRevenue: number;
    totalProviders: number;
    averageRevenuePerProvider: number;
    currency: string;
  };

  constructor(orders: OrderEntity[], pagination: IPaginationParams) {
    const providerMap = new Map<
      number,
      {
        providerName: string;
        email: string;
        totalRevenue: number;
        totalOrders: number;
        totalRefunds: number;
        lastOrderDate: Date;
        joinDate: Date;
        currency: string;
      }
    >();

    orders.forEach((order) => {
      const providerId = order.appointment?.providerId;
      if (!providerId) return;

      const providerName = order.appointment?.provider?.username || '';
      const email = order.appointment?.provider?.email || '';
      const revenue = parseFloat(order.totalAmount.toString());
      const refunds = order.payments?.reduce(
        (sum, p) => sum + parseFloat(p.refundAmount?.toString() || '0'),
        0,
      ) || 0;
      const orderDate = order.createdAt || new Date();
      const joinDate = order.appointment?.provider?.createdAt || new Date();
      const currency = order.currency || 'usd';

      if (!providerMap.has(providerId)) {
        providerMap.set(providerId, {
          providerName,
          email,
          totalRevenue: revenue,
          totalOrders: 1,
          totalRefunds: refunds,
          lastOrderDate: orderDate,
          joinDate,
          currency,
        });
      } else {
        const p = providerMap.get(providerId)!;
        p.totalRevenue += revenue;
        p.totalOrders += 1;
        p.totalRefunds += refunds;
        if (orderDate > p.lastOrderDate) p.lastOrderDate = orderDate;
      }
    });

    const providersArray = Array.from(providerMap.entries()).map(
      ([providerId, data]) => ({
        providerId,
        providerName: data.providerName,
        email: data.email,
        totalRevenue: data.totalRevenue,
        totalOrders: data.totalOrders,
        totalRefunds: data.totalRefunds,
        netRevenue: data.totalRevenue - data.totalRefunds,
        lastOrderDate: data.lastOrderDate.toISOString(),
        joinDate: data.joinDate.toISOString(),
        currency: data.currency,
      }),
    );

    const totalProviders = providersArray.length;
    const totalRevenue = providersArray.reduce(
      (sum, p) => sum + p.totalRevenue,
      0,
    );
    const averageRevenuePerProvider =
      totalProviders > 0 ? totalRevenue / totalProviders : 0;
    const currency =
      providersArray.length > 0 ? providersArray[0].currency : 'usd';

    const total = totalProviders;
    const paginatedProviders = providersArray.slice(
      (pagination.page - 1) * pagination.size,
      pagination.page * pagination.size,
    );

    this.providers = paginatedProviders;
    this.pagination = { page: pagination.page, size: pagination.size, total };
    this.summary = {
      totalRevenue,
      totalProviders,
      averageRevenuePerProvider,
      currency,
    };
  }
}
