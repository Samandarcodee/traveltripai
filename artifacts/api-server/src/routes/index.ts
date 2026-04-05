import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./conversations";
import leadsRouter from "./leads";
import statsRouter from "./stats";
import chatRouter from "./chat";
import promotionsRouter from "./promotions";
import callAnalysisRouter from "./call-analysis";
import templatesRouter from "./templates";
import settingsRouter from "./settings";
import telegramRouter from "./telegram";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(conversationsRouter);
router.use(leadsRouter);
router.use(statsRouter);
router.use(chatRouter);
router.use(promotionsRouter);
router.use(callAnalysisRouter);
router.use(templatesRouter);
router.use(settingsRouter);
router.use(telegramRouter);
router.use(tasksRouter);

export default router;
