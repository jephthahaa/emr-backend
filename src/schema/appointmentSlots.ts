import { z } from 'zod';

export const getAppointmentSlotsSchema = z.object({
  date: z.date().default(new Date()),
});