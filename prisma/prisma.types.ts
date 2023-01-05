import { Prisma } from '@prisma/client';

const subscriber = Prisma.validator<Prisma.subscriptionsArgs>()({
  select: { subscriberId: true, subscriberType: true },
});

export type Subscriber = Prisma.subscriptionsGetPayload<typeof subscriber>;
