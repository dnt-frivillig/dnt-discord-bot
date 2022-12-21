import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DbService {
  prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getActivities(tripType: string, after: Date) {
    return this.prisma.activities.findMany({
      where: {
        tripType: { has: tripType },
        createdAt: { gt: after },
      },
    });
  }
}
