import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./conversations";
import leadsRouter from "./leads";
import statsRouter from "./stats";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(conversationsRouter);
router.use(leadsRouter);
router.use(statsRouter);
router.use(chatRouter);

export default router;
