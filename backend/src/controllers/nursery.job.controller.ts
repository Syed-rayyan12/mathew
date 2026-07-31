import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { activeJobLimit } from '../utils/entitlements';
import { decideActivation } from '../utils/active-job-limit';

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
    const { title, department, location, type, experience, description, responsibilities, requirements, image, replaceActiveJobId } = req.body;

    if (!title || !department || !experience || !description) {
      return res.status(400).json({ success: false, message: 'title, department, experience and description are required' });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Lock the user row to serialise with concurrent publishes
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

      const owner = await tx.user.findUnique({
        where: { id: userId },
        select: {
          planTier: true,
          paidNurseryCount: true,
          jobsAddonStatus: true,
          nurseryName: true,
          firstName: true,
          lastName: true,
          groups: { take: 1, select: { name: true, city: true, town: true } },
        },
      });

      if (!owner) {
        return { ok: false as const, status: 404, body: { success: false, message: 'User not found' } };
      }

      const limit = activeJobLimit(owner);

      // Count active jobs for this user
      const activeJobs = await tx.job.findMany({
        where: { postedById: userId, isActive: true },
        select: { id: true, title: true },
      });
      const activeIds = activeJobs.map((j: any) => j.id);

      const decision = decideActivation({
        limit,
        currentActiveIds: activeIds,
        targetId: null,
        replaceId: replaceActiveJobId ?? null,
      });

      if (decision.action === 'blocked') {
        const blocker = activeJobs.find((j: any) => j.id === decision.conflictId);
        return {
          ok: false as const,
          status: 409,
          body: {
            success: false,
            code: 'ACTIVE_JOB_LIMIT',
            data: { activeJob: { id: decision.conflictId, title: blocker?.title ?? '' } },
            message: 'You already have a live advert. Swap it or deactivate it first.',
          },
        };
      }

      // If swapping, deactivate the replaced job
      if (decision.action === 'swap') {
        await tx.job.update({
          where: { id: decision.deactivateId },
          data: { isActive: false },
        });
      }

      const group = owner.groups?.[0];
      const resolvedNurseryName =
        group?.name || owner.nurseryName ||
        `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || null;
      const resolvedLocation =
        (location && location.trim()) || group?.town || group?.city || '';

      if (!resolvedLocation) {
        return { ok: false as const, status: 400, body: { success: false, message: 'location is required' } };
      }

      const job = await tx.job.create({
        data: {
          title: title.trim(),
          department: department.trim(),
          location: resolvedLocation.trim(),
          type: type || 'FULL_TIME',
          experience: experience.trim(),
          description: description.trim(),
          responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
          requirements: Array.isArray(requirements) ? requirements : [],
          image: image || null,
          isActive: true,
          postedById: userId,
          nurseryName: resolvedNurseryName,
        },
      });

      return { ok: true as const, job };
    }, { timeout: 10000 });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    res.status(201).json({ success: true, data: result.job });
  } catch (error) {
    next(error);
  }
};

// ── Nursery: update own job ───────────────────────────────────────────────────
export const nurseryUpdateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { title, department, location, type, experience, description, responsibilities, requirements, image, isActive, replaceActiveJobId } = req.body;

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;

      const existing = await tx.job.findFirst({ where: { id, postedById: userId } });
      if (!existing) {
        return { ok: false as const, status: 404, body: { success: false, message: 'Job not found or not yours' } };
      }

      // Only enforce the limit when activating (going from inactive to active, or staying active)
      if (isActive === true || (isActive === undefined && existing.isActive)) {
        const owner = await tx.user.findUnique({
          where: { id: userId },
          select: { planTier: true, paidNurseryCount: true, jobsAddonStatus: true },
        });

        if (owner) {
          const limit = activeJobLimit(owner);
          const activeJobs = await tx.job.findMany({
            where: { postedById: userId, isActive: true },
            select: { id: true, title: true },
          });
          const activeIds = activeJobs.map((j: any) => j.id);

          const decision = decideActivation({
            limit,
            currentActiveIds: activeIds,
            targetId: id,
            replaceId: replaceActiveJobId ?? null,
          });

          if (decision.action === 'blocked') {
            const blocker = activeJobs.find((j: any) => j.id === decision.conflictId);
            return {
              ok: false as const,
              status: 409,
              body: {
                success: false,
                code: 'ACTIVE_JOB_LIMIT',
                data: { activeJob: { id: decision.conflictId, title: blocker?.title ?? '' } },
                message: 'You already have a live advert. Swap it or deactivate it first.',
              },
            };
          }

          if (decision.action === 'swap') {
            await tx.job.update({
              where: { id: decision.deactivateId },
              data: { isActive: false },
            });
          }
        }
      }

      // Refresh nurseryName from group
      const ownerProfile = await tx.user.findUnique({
        where: { id: userId },
        select: {
          nurseryName: true,
          firstName: true,
          lastName: true,
          groups: { take: 1, select: { name: true } },
        },
      });
      const refreshedNurseryName =
        ownerProfile?.groups?.[0]?.name ||
        ownerProfile?.nurseryName ||
        `${ownerProfile?.firstName ?? ''} ${ownerProfile?.lastName ?? ''}`.trim() ||
        null;

      const job = await tx.job.update({
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
          nurseryName: refreshedNurseryName,
        },
      });

      return { ok: true as const, job };
    }, { timeout: 10000 });

    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }

    res.json({ success: true, data: result.job });
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
