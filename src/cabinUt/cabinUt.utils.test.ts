import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { getVisbookId, isReservationsUrl } from './cabinUt.utils';

describe('Extract visbook cabin id from booking URL', () => {
  it('finds id in reservations url', () => {
    const url = 'https://reservations.visbook.com/6093';
    assert.deepEqual(getVisbookId(url), 6093);
  });
  it('finds id in bookings url (NO)', () => {
    const url = 'https://booking.visbook.com/no/5546';
    assert.deepEqual(getVisbookId(url), 5546);
  });
  it('finds id in bookings url (EN)', () => {
    const url = 'https://booking.visbook.com/en/5546';
    assert.deepEqual(getVisbookId(url), 5546);
  });
  it('returns 0 if not found', () => {
    const url = 'https://reservations.visbook.com';
    assert.deepEqual(getVisbookId(url), 0);
  });
});

describe('Determine if booking URL points to a reservations page', () => {
  it('returns true if url contains reservations', () => {
    const url = 'https://reservations.visbook.com/6093';
    assert.deepEqual(isReservationsUrl(url), true);
  });
  it('returns false if url does not contain reservations', () => {
    const url = 'https://booking.visbook.com/no/6093';
    assert.deepEqual(isReservationsUrl(url), false);
  });
  it('returns false for an email address', () => {
    const url = 'reservations@dnt.hytte';
    assert.deepEqual(isReservationsUrl(url), false);
  });
  it('returns false for text only', () => {
    const url = 'For reservations call us at 123 456';
    assert.deepEqual(isReservationsUrl(url), false);
  });
});
