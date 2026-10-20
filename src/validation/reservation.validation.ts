import { z } from 'zod';

export const identifierSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid MongoDB identifier.');

export const createReservationSchema = z
  .object({
    resourceId: identifierSchema,
    userId: identifierSchema,
    startTime: z.iso.datetime({ offset: true }),
    endTime: z.iso.datetime({ offset: true }),
  })
  .strict();

export const resourceQuerySchema = z
  .object({
    type: z
      .string()
      .trim()
      .pipe(z.enum(['ROOM', 'EQUIPMENT', 'LAB']))
      .optional(),
    isAvailable: z
      .enum(['true', 'false'])
      .transform((value: string): boolean => value === 'true')
      .optional(),
  })
  .strict();
