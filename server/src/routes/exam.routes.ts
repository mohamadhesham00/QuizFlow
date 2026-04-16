import { Router } from "express";
import {
  createExam,
  exportExamResults,
  getAnalytics,
  getAttemptDetail,
  getExamById,
  getExamForms,
  getResults,
  listExams,
  publishExam,
  removeExam,
  unpublishExam,
  updateAttemptTimer,
  updateExam,
} from "../controllers/exam.controller";
import authMiddleware from "../middlewares/auth";
import authorize from "../middlewares/authorize";
import validate from "../middlewares/validate";
import {
  createExamSchema,
  updateAttemptTimerSchema,
  updateExamSchema,
} from "../validators/exam.validator";
import { ROLES } from "../constants/roles";

const router = Router();

router.use(authMiddleware, authorize(ROLES.TEACHER));

router.post("/", validate(createExamSchema), createExam);
router.get("/", listExams);
router.get("/:id", getExamById);
router.get("/:id/forms", getExamForms);
router.get("/:id/results", getResults);
router.get("/:id/analytics", getAnalytics);
router.get("/:id/attempts/:attemptId", getAttemptDetail);
router.patch("/:id/publish", publishExam);
router.patch("/:id/unpublish", unpublishExam);
router.patch("/:id", validate(updateExamSchema), updateExam);
router.patch(
  "/:id/attempts/:attemptId/timer",
  validate(updateAttemptTimerSchema),
  updateAttemptTimer,
);
router.delete("/:id", removeExam);
router.get("/:id/export", exportExamResults);

export default router;
