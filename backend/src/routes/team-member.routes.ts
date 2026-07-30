import { Router } from 'express';
import { authenticate, requireFeature } from '../middleware';
import { getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember } from '../controllers/team-member.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getTeamMembers);
router.post('/', authenticate, requireFeature('teamMembers'), addTeamMember);
router.put('/:memberId', authenticate, requireFeature('teamMembers'), updateTeamMember);
router.delete('/:memberId', authenticate, requireFeature('teamMembers'), deleteTeamMember);

export default router;
