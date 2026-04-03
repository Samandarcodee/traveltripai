import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./conversations";
import leadsRouter from "./leads";
import statsRouter from "./stats";
import chatRouter from "./chat";
import promotionsRouter from "./promotions";
import callAnalysisRouter from "./call-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(conversationsRouter);
router.use(leadsRouter);
router.use(statsRouter);
router.use(chatRouter);
router.use(promotionsRouter);
router.use(callAnalysisRouter);

export default router;
