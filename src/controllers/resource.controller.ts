import { Request, Response } from 'express';
import { listResources } from '../services/resource.service';
import type { ErrorResponse, Resource, ResourceQuery } from '../../shared/api';
import { resourceQuerySchema } from '../validation/reservation.validation';

export const getResources = async (
  req: Request,
  res: Response<Resource[] | ErrorResponse>,
): Promise<void> => {
  const filters: ResourceQuery = resourceQuerySchema.parse(req.query);
  const resources = await listResources(filters);
  res.status(200).json(resources);
};
