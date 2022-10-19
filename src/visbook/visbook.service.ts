import { Injectable } from '@nestjs/common';
import { VisbookApi } from './visbook.api';

@Injectable()
export class VisbookService {
  constructor(private readonly visbookApi: VisbookApi) {}

  async isCabinAvailable(
    cabinVisbookId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<boolean> {
    const visbookResponse = await this.visbookApi.getAccommodationAvailability(
      cabinVisbookId,
      checkIn,
      checkOut,
    );

    const accommodations = visbookResponse.accommodations;

    if (accommodations === undefined) {
      return false;
    }

    for (const accommodation of accommodations) {
      if (accommodation.availability.available === true) return true;
    }

    return false;
  }
}