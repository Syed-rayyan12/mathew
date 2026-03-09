import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware';
import { UnauthorizedError, NotFoundError } from '../utils';

async function generateTeamMemberId(): Promise<string> {
  // Find the highest existing tm### ID
  const last = await (prisma as any).teamMember.findFirst({
    where: { id: { startsWith: 'tm' } },
    orderBy: { id: 'desc' },
    select: { id: true },
  });

  let next = 1;
  if (last) {
    const num = parseInt(last.id.replace('tm', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `tm${String(next).padStart(3, '0')}`;
}

// GET /nurseries/:nurseryId/team — nursery dashboard
export const getTeamMembers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nurseryId } = req.params;
    const userId = req.user?.userId;

    const nursery = await prisma.nursery.findFirst({
      where: { id: nurseryId, ownerId: userId },
    });
    if (!nursery) throw new UnauthorizedError('Not authorised');

    const members = await (prisma as any).teamMember.findMany({
      where: { nurseryId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

// POST /nurseries/:nurseryId/team
export const addTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nurseryId } = req.params;
    const userId = req.user?.userId;
    const { name, experience, qualifications, crbChecked } = req.body;

    const nursery = await prisma.nursery.findFirst({
      where: { id: nurseryId, ownerId: userId },
    });
    if (!nursery) throw new UnauthorizedError('Not authorised');

    const member = await (prisma as any).teamMember.create({
      data: {
        id: await generateTeamMemberId(),
        name,
        experience: experience || null,
        qualifications: qualifications || null,
        crbChecked: !!crbChecked,
        nurseryId,
      },
    });

    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

// PUT /nurseries/:nurseryId/team/:memberId
export const updateTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nurseryId, memberId } = req.params;
    const userId = req.user?.userId;
    const { name, experience, qualifications, crbChecked } = req.body;

    const nursery = await prisma.nursery.findFirst({
      where: { id: nurseryId, ownerId: userId },
    });
    if (!nursery) throw new UnauthorizedError('Not authorised');

    const member = await (prisma as any).teamMember.findFirst({
      where: { id: memberId, nurseryId },
    });
    if (!member) throw new NotFoundError('Team member not found');

    const updated = await (prisma as any).teamMember.update({
      where: { id: memberId },
      data: { name, experience, qualifications, crbChecked: !!crbChecked },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /nurseries/:nurseryId/team/:memberId
export const deleteTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nurseryId, memberId } = req.params;
    const userId = req.user?.userId;

    const nursery = await prisma.nursery.findFirst({
      where: { id: nurseryId, ownerId: userId },
    });
    if (!nursery) throw new UnauthorizedError('Not authorised');

    await (prisma as any).teamMember.deleteMany({
      where: { id: memberId, nurseryId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
