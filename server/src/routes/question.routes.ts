import { Router } from "express";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  removeQuestionImage,
  updateQuestion,
  uploadQuestionImage,
} from "../controllers/question.controller";
import authMiddleware from "../middlewares/auth";
import authorize from "../middlewares/authorize";
import validate from "../middlewares/validate";
import {
  createQuestionSchema,
  updateQuestionSchema,
} from "../validators/question.validator";
import { upload } from "../utils/cloudinary";
import { ROLES } from "../constants/roles";

const router = Router();

router.use(authMiddleware, authorize(ROLES.TEACHER));

router.post("/", validate(createQuestionSchema), createQuestion);
router.get("/", getQuestions);
router.get("/:id", getQuestionById);
router.patch("/:id", validate(updateQuestionSchema), updateQuestion);
router.delete("/:id", deleteQuestion);
router.post("/:id/image", upload.single("image"), uploadQuestionImage);
router.delete("/:id/image", removeQuestionImage);

export default router;
