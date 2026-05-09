import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { CreateTemplateBody, UpdateTemplateBody, GetTemplateParams } from "../lib/validation";
import { ApiErrorException } from "../middlewares/error-handler";

const router: IRouter = Router();

router.get("/templates", async (req, res, next) => {
  try {
    const templates = await db
      .select()
      .from(templatesTable)
      .orderBy(templatesTable.sortOrder, templatesTable.id);
    
    res.json({
      success: true,
      data: templates,
    });
  } catch (err) {
    logger.error({ error: err }, "Failed to fetch templates");
    next(new ApiErrorException("FETCH_FAILED", "Failed to fetch templates", 500));
  }
});

router.post("/templates", async (req, res, next) => {
  try {
    const parsed = CreateTemplateBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiErrorException(
        "VALIDATION_ERROR",
        "Invalid template data",
        400,
        parsed.error.errors,
      );
    }

    const [template] = await db
      .insert(templatesTable)
      .values(parsed.data)
      .returning();

    logger.info({ templateId: template.id }, "Template created");

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (err) {
    if (err instanceof ApiErrorException) {
      return next(err);
    }
    logger.error({ error: err }, "Failed to create template");
    next(
      new ApiErrorException(
        "CREATE_FAILED",
        "Failed to create template",
        500,
      ),
    );
  }
});

router.patch("/templates/:id", async (req, res, next) => {
  try {
    const paramsResult = GetTemplateParams.safeParse({ id: req.params.id });
    if (!paramsResult.success) {
      throw new ApiErrorException(
        "VALIDATION_ERROR",
        "Invalid template ID",
        400,
      );
    }

    const bodyResult = UpdateTemplateBody.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ApiErrorException(
        "VALIDATION_ERROR",
        "Invalid template data",
        400,
        bodyResult.error.errors,
      );
    }

    const id = paramsResult.data.id;
    const [template] = await db
      .update(templatesTable)
      .set(bodyResult.data)
      .where(eq(templatesTable.id, id))
      .returning();

    if (!template) {
      throw new ApiErrorException(
        "NOT_FOUND",
        "Template not found",
        404,
      );
    }

    logger.info({ templateId: id }, "Template updated");

    res.json({
      success: true,
      data: template,
    });
  } catch (err) {
    if (err instanceof ApiErrorException) {
      return next(err);
    }
    logger.error({ error: err }, "Failed to update template");
    next(
      new ApiErrorException(
        "UPDATE_FAILED",
        "Failed to update template",
        500,
      ),
    );
  }
});

router.delete("/templates/:id", async (req, res, next) => {
  try {
    const paramsResult = GetTemplateParams.safeParse({ id: req.params.id });
    if (!paramsResult.success) {
      throw new ApiErrorException(
        "VALIDATION_ERROR",
        "Invalid template ID",
        400,
      );
    }

    const id = paramsResult.data.id;
    const [deleted] = await db
      .delete(templatesTable)
      .where(eq(templatesTable.id, id))
      .returning();

    if (!deleted) {
      throw new ApiErrorException(
        "NOT_FOUND",
        "Template not found",
        404,
      );
    }

    logger.info({ templateId: id }, "Template deleted");

    res.status(204).send();
  } catch (err) {
    if (err instanceof ApiErrorException) {
      return next(err);
    }
    logger.error({ error: err }, "Failed to delete template");
    next(
      new ApiErrorException(
        "DELETE_FAILED",
        "Failed to delete template",
        500,
      ),
    );
  }
});

export default router;
