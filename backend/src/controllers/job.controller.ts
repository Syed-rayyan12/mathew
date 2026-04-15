import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// ── Public: get all active jobs ───────────────────────────────────────────────
export const getJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

// ── Public: apply for a job ───────────────────────────────────────────────────
export const applyForJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { fullName, email, phone, coverLetter, cvUrl } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    const job = await prisma.job.findFirst({ where: { id: jobId, isActive: true } });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Prevent duplicate applications from same email for same job
    const existing = await prisma.jobApplication.findFirst({
      where: { jobId, email: email.toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this position',
      });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        coverLetter: coverLetter?.trim() || null,
        cvUrl: cvUrl?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: application, message: 'Application submitted successfully' });
  } catch (error) {
    next(error);
  }
};
