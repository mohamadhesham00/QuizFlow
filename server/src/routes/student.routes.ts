import { Router } from "express";
import {
  getAttemptResult,
  getAttemptState,
  getAttemptTimer,
  getAttemptQuestions,
  heartbeatAttempt,
  listAvailableExams,
  myAttempts,
  saveAttemptAnswers,
  startExam,
  submitAttempt,
} from "../controllers/student.controller";
import authMiddleware from "../middlewares/auth";
import authorize from "../middlewares/authorize";
import validate from "../middlewares/validate";
import {
  saveDraftAnswersSchema,
  submitAttemptSchema,
} from "../validators/student.validator";
import { ROLES } from "../constants/roles";

const router = Router();

router.use(authMiddleware, authorize(ROLES.STUDENT));

router.get("/exams", listAvailableExams);
router.post("/exams/:examId/start", startExam);
router.get("/attempts/:attemptId", getAttemptQuestions);
router.get("/attempts/:attemptId/state", getAttemptState);
router.get("/attempts/:attemptId/timer", getAttemptTimer);
router.post("/attempts/:attemptId/heartbeat", heartbeatAttempt);
router.patch(
  "/attempts/:attemptId/answers",
  validate(saveDraftAnswersSchema),
  saveAttemptAnswers,
);
router.post(
  "/attempts/:attemptId/submit",
  validate(submitAttemptSchema),
  submitAttempt,
);
router.get("/attempts/:attemptId/result", getAttemptResult);
router.get("/attempts", myAttempts);

export default router;
