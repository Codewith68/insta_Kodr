import {Router} from 'express';
import { searchUser, toggleFollowUser, getUserConnections, acceptFollowRequest, rejectFollowRequest, getPendingRequests, updateProfile } from '../controllers/user.controller.js';
import { auth } from '../middleware/auth.middleware.js';
import upload from '../config/multer.config.js';

const router=Router();

router.get('/search',searchUser);
router.post('/follow/:id', auth, toggleFollowUser);
router.get('/:id/connections', auth, getUserConnections);
router.post('/accept-request/:id', auth, acceptFollowRequest);
router.post('/reject-request/:id', auth, rejectFollowRequest);
router.get('/follow-requests', auth, getPendingRequests);
router.put('/profile', auth, upload.single('profilePic'), updateProfile);

export default router;
