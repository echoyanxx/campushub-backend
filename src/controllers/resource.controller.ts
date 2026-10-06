import { Request, Response } from 'express';
import { listResources as listResourcesService } from '../services/resource.service';

const handleServiceError = (res: Response, error: unknown): void => {
  if (error && typeof error === 'object' && 'status' in error && 'payload' in error) {
    const apiError = error as { status: number; payload: { error?: string; message: string } };
    res.status(apiError.status).json(apiError.payload);
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
};

export const getResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const resources = await listResourcesService(type);
    res.status(200).json(resources);
  } catch (error) {
    handleServiceError(res, error);
  }
};
