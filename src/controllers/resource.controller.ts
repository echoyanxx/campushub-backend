import { NextFunction, Request, Response } from 'express';
import { listResources } from '../services/resource.service';
import { ErrorResponse, Resource, ResourceQuery } from '../types/reservation';
import { resourceQuerySchema } from '../validation/reservation.validation';

export const getResources = async (
  req: Request,
  res: Response<Resource[] | ErrorResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters: ResourceQuery = resourceQuerySchema.parse(req.query);
    const resources = await listResources(filters);
    res.status(200).json(resources);
  } catch (error: unknown) {
    next(error);
  }
};
