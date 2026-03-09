import { Router } from 'express';
import { authenticate } from '../middleware';
import { getTeamMembers, addTeamMember, updateTeamMember, deleteTeamMember } from '../controllers/team-member.controller';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getTeamMembers);
router.post('/', authenticate, addTeamMember);
router.put('/:memberId', authenticate, updateTeamMember);
router.delete('/:memberId', authenticate, deleteTeamMember);

export default router;
