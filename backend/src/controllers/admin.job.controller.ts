import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// ── Admin: create a new job post ──────────────────────────────────────────────
export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, department, location, nurseryName, type, experience, description, responsibilities, requirements, image } = req.body;

    if (!title || !department || !location || !nurseryName || !experience || !description) {
      return res.status(400).json({ success: false, message: 'title, department, location, nurseryName, experience and description are required' });
    }

    const job = await prisma.job.create({
      data: {
        title: title.trim(),
        department: department.trim(),
        location: location.trim(),
        nurseryName: nurseryName.trim(),
        type: type || 'FULL_TIME',
        experience: experience.trim(),
        description: description.trim(),
        responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
        requirements: Array.isArray(requirements) ? requirements : [],
        image: image || null,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// ── Admin: update a job post ──────────────────────────────────────────────────
export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, department, location, nurseryName, type, experience, description, responsibilities, requirements, image, isActive } = req.body;

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(department && { department: department.trim() }),
        ...(location && { location: location.trim() }),
        ...(nurseryName !== undefined && { nurseryName: nurseryName.trim() }),
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

// ── Admin: delete a job post ──────────────────────────────────────────────────
export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.job.delete({ where: { id } });
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
};

// ── Admin: get all jobs (including inactive) ──────────────────────────────────
export const getAllJobsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 200 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count(),
    ]);
    res.json({ success: true, data: jobs, count: total });
  } catch (error) {
    next(error);
  }
};

// ── Admin: get all applicants (optionally filtered by jobId) ──────────────────
export const getApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, status, page = 1, limit = 500 } = req.query;

    const where: any = {};
    if (jobId) where.jobId = jobId as string;
    if (status) where.status = status as string;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          job: {
            select: { id: true, title: true, department: true, location: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    res.json({ success: true, data: applications, count: total });
  } catch (error) {
    next(error);
  }
};

// ── Admin: update application status ─────────────────────────────────────────
export const updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await prisma.jobApplication.update({
      where: { id },
      data: { status },
      include: {
        job: { select: { title: true } },
      },
    });

    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};
