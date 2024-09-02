import { Router, Response, Request } from "express";
import { initialise } from "../controllers/notifications.controller";
import { verifyToken } from "../middleware/auth";


const notificationRouter = Router();

notificationRouter.get('/',verifyToken, initialise);

export default notificationRouter;