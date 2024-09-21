import { AuthController } from '@controllers';
import { authenticateToken } from '@middlewares';
import { Router } from 'express';

const authRouter = Router();

authRouter.post('/send-code', AuthController.sendCode);
authRouter.post('/verify-code', AuthController.verifyCode);
authRouter.post('/forgotPassword', AuthController.forgotPassword);
authRouter.patch('/changePassword',authenticateToken, AuthController.changePassword);
authRouter.post('/resetPassword', AuthController.resetPassword);
authRouter.get('/getProfile',authenticateToken, AuthController.getProfile);


export  {authRouter};
