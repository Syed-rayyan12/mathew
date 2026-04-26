import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// Helper: get userId from the authenticated request
const getUserId = (req: Request): string => (req as any).user?.userId;

// ── Nursery: get my posted jobs ───────────────────────────────────────────────
export const nurseryGetMyJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const jobs = await prisma.job.findMany({
      where: { postedById: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: create a job ─────────────────────────────────────────────────────
export const nurseryCreateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { title, department, location, type, experience, description, responsibilities, requirements, image } = req.body;

    if (!title || !department || !location || !experience || !description) {
      return res.status(400).json({ success: false, message: 'title, department, location, experience and description are required' });
    }

    // Fetch the nursery owner's nurseryName to stamp on the job
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { nurseryName: true, firstName: true, lastName: true },
    });

    const job = await prisma.job.create({
      data: {
        title: title.trim(),
        department: department.trim(),
        location: location.trim(),
        type: type || 'FULL_TIME',
        experience: experience.trim(),
        description: description.trim(),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
        requirements: Array.isArray(requirements) ? requirements : [],
        image: image || null,
        isActive: true,
        postedById: userId,
        nurseryName: owner?.nurseryName || `${owner?.firstName ?? ''} ${owner?.lastName ?? ''}`.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: update own job ───────────────────────────────────────────────────
export const nurseryUpdateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const existing = await prisma.job.findFirst({ where: { id, postedById: userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Job not found or not yours' });
    }

    const { title, department, location, type, experience, description, responsibilities, requirements, image, isActive } = req.body;

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(department && { department: department.trim() }),
        ...(location && { location: location.trim() }),
        ...(type && { type }),
        ...(experience && { experience: experience.trim() }),
        ...(description && { description: description.trim() }),
        ...(responsibilities && { responsibilities }),
        ...(requirements && { requirements }),
        ...(image !== undefined && { image }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: delete own job ───────────────────────────────────────────────────
export const nurseryDeleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const existing = await prisma.job.findFirst({ where: { id, postedById: userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Job not found or not yours' });
    }

    await prisma.job.delete({ where: { id } });
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: get applicants for my jobs ───────────────────────────────────────
export const nurseryGetMyApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { jobId, status } = req.query;

    // Get IDs of all jobs owned by this nursery owner
    const myJobs = await prisma.job.findMany({
      where: { postedById: userId },
      select: { id: true },
    });
    const myJobIds = myJobs.map(j => j.id);

    if (myJobIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const where: any = { jobId: { in: myJobIds } };
    if (jobId && myJobIds.includes(jobId as string)) where.jobId = jobId;
    if (status) where.status = status;

    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, department: true, location: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: update application status ───────────────────────────────────────
export const nurseryUpdateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    // Confirm this application belongs to one of the nursery's jobs
    const application = await prisma.jobApplication.findFirst({
      where: { id },
      include: { job: { select: { postedById: true } } },
    });

    if (!application || application.job.postedById !== userId) {
      return res.status(404).json({ success: false, message: 'Application not found or not authorized' });
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
