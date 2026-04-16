import { useEffect, useState, type FormEvent } from "react";
import {
  createExam,
  listExams,
  listQuestionsPaginated,
  publishExam,
  unpublishExam,
  updateExam,
} from "../../lib/api";
import type { Exam, Question } from "../../types/api";

export function ExamBuilderPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "manage">("generate");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionTotalPages, setQuestionTotalPages] = useState(1);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [publishingExamId, setPublishingExamId] = useState<string | null>(null);
  const [unpublishingExamId, setUnpublishingExamId] = useState<string | null>(
    null,
  );
  const [publishMessage, setPublishMessage] = useState<string>("");
  const [publishError, setPublishError] = useState<string>("");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

  const getStudentEntryId = (exam: Exam) =>
    exam.examCode || exam.accessCode || exam.publicExamId || exam._id;

  const activeQuestion =
    questions.find((question) => question._id === activeQuestionId) || null;

  const loadQuestions = async (page = questionPage) => {
    setQuestionLoading(true);
    try {
      const data = await listQuestionsPaginated({ page, limit: 10 });
      setQuestions(data.items);
      setQuestionPage(data.pagination.page);
      setQuestionTotalPages(Math.max(1, data.pagination.totalPages));
      setQuestionTotal(data.pagination.total);
      setActiveQuestionId((prev) =>
        prev && data.items.some((item) => item._id === prev) ? prev : null,
      );
    } finally {
      setQuestionLoading(false);
    }
  };

  const loadData = async () => {
    const examData = await listExams();
    setExams(examData);
  };

  useEffect(() => {
    void loadData();
    void loadQuestions(1);
  }, []);

  const toggleQuestion = (questionId: string) => {
    setSelected((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  const onCreateExam = async (event: FormEvent) => {
    event.preventDefault();
    await createExam({
      title,
      description,
      questionIds: selected,
    });
    setTitle("");
    setDescription("");
    setSelected([]);
    await loadData();
    await loadQuestions(questionPage);
  };

  const onPublish = async (examId: string) => {
    setPublishError("");
    setPublishMessage("");
    setPublishingExamId(examId);

    try {
      const publishedExam = await publishExam(examId);
      setExams((prev) =>
        prev.map((exam) =>
          exam._id === examId
            ? { ...exam, published: true, isPublished: true }
            : exam,
        ),
      );

      const studentEntryId = getStudentEntryId(publishedExam);
      setPublishMessage(`Exam published. Student entry ID: ${studentEntryId}`);
    } catch {
      setPublishError("Could not publish exam. Please try again.");
    } finally {
      setPublishingExamId(null);
    }
  };

  const onUnpublish = async (examId: string) => {
    setPublishError("");
    setPublishMessage("");
    setUnpublishingExamId(examId);

    try {
      await unpublishExam(examId);
      setExams((prev) =>
        prev.map((exam) =>
          exam._id === examId
            ? { ...exam, published: false, isPublished: false }
            : exam,
        ),
      );
      setPublishMessage("Exam moved back to draft state.");
    } catch {
      setPublishError("Could not unpublish exam. Please try again.");
    } finally {
      setUnpublishingExamId(null);
    }
  };

  const onEditExam = (exam: Exam) => {
    setEditingExamId(exam._id);
    setEditTitle(exam.title);
    setEditDescription(exam.description || "");
    setEditMessage("");
    setEditError("");
  };

  const onUpdateExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingExamId) return;

    setEditError("");
    setEditMessage("");

    try {
      const updatedExam = await updateExam(editingExamId, {
        title: editTitle,
        description: editDescription,
      });
      setExams((prev) =>
        prev.map((exam) => (exam._id === editingExamId ? updatedExam : exam)),
      );
      setEditMessage("Exam updated successfully.");
      setTimeout(() => {
        setEditingExamId(null);
        setEditMessage("");
      }, 1500);
    } catch {
      setEditError("Could not update exam. Please try again.");
    }
  };

  return (
    <div>
      <div
        className="inline-row"
        style={{
          borderBottom: "1px solid rgba(195,198,215,0.6)",
          marginBottom: 20,
        }}
      >
        <button
          className={`button ${activeTab === "generate" ? "" : "button--secondary"}`}
          type="button"
          onClick={() => setActiveTab("generate")}
        >
          Generate Exams
        </button>
        <button
          className={`button ${activeTab === "manage" ? "" : "button--secondary"}`}
          type="button"
          onClick={() => setActiveTab("manage")}
        >
          Manage Exams
        </button>
      </div>

      {activeTab === "generate" && (
        <section className="panel">
          <h2>Generate exam forms</h2>
          <p className="muted">
            Backend should shuffle questions and options into 4 forms
            automatically.
          </p>
          <form className="stack" onSubmit={onCreateExam}>
            <label>
              Title
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label>
              Description
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="panel panel--nested">
              <h3>
                Select questions ({selected.length})
                <small className="muted" style={{ marginLeft: 8 }}>
                  {`Total: ${questionTotal}`}
                </small>
              </h3>
              <ul className="list">
                {questionLoading ? (
                  <li className="list-item">Loading questions...</li>
                ) : (
                  questions.map((question) => (
                    <li
                      key={question._id}
                      className="list-item exam-question-row"
                    >
                      <button
                        type="button"
                        className={`exam-question-card${activeQuestionId === question._id ? " exam-question-card--active" : ""}`}
                        onClick={() => setActiveQuestionId(question._id)}
                      >
                        <span className="material-symbols-outlined exam-question-card__icon">
                          quiz
                        </span>
                        <span className="exam-question-card__content">
                          <strong>{question.text}</strong>
                          <small className="muted">
                            {(question.subject || "General") +
                              " • " +
                              (question.difficulty || "medium")}
                          </small>
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`icon-button exam-question-select${selected.includes(question._id) ? " exam-question-select--active" : ""}`}
                        onClick={() => toggleQuestion(question._id)}
                        aria-label={
                          selected.includes(question._id)
                            ? "Remove question from exam"
                            : "Add question to exam"
                        }
                      >
                        <span className="material-symbols-outlined">
                          {selected.includes(question._id)
                            ? "check_circle"
                            : "add_circle"}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div
                className="inline-row inline-row--space"
                style={{ marginTop: 10 }}
              >
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={questionPage <= 1 || questionLoading}
                  onClick={() => void loadQuestions(questionPage - 1)}
                >
                  Previous Page
                </button>
                <small className="muted">
                  Page {questionPage} of {questionTotalPages}
                </small>
                <button
                  className="button"
                  type="button"
                  disabled={
                    questionPage >= questionTotalPages || questionLoading
                  }
                  onClick={() => void loadQuestions(questionPage + 1)}
                >
                  Next Page
                </button>
              </div>
            </div>

            <button
              className="button"
              type="submit"
              disabled={selected.length === 0}
            >
              Create exam
            </button>
          </form>
        </section>
      )}

      {activeTab === "manage" && (
        <section className="panel">
          <h2>Existing exams</h2>
          {publishMessage && (
            <p style={{ color: "#065f46" }}>{publishMessage}</p>
          )}
          {publishError && <p style={{ color: "#b91c1c" }}>{publishError}</p>}
          <ul className="list">
            {exams.map((exam) => (
              <li key={exam._id} className="list-item">
                <div>
                  <p>{exam.title}</p>
                  <small className="muted">
                    {exam.description || "No description"}
                  </small>
                  <div style={{ marginTop: 6 }}>
                    <small className="muted">
                      Student Entry ID:{" "}
                      <strong>{getStudentEntryId(exam)}</strong>
                    </small>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <small
                      style={{ color: exam.published ? "#047857" : "#6b7280" }}
                    >
                      {exam.published ? "Published" : "Draft"}
                    </small>
                  </div>
                </div>
                <div className="inline-row" style={{ gap: 8 }}>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onEditExam(exam)}
                    aria-label="Edit exam"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    className={`button ${exam.published || exam.isPublished ? "button--success" : "button--secondary"}`}
                    type="button"
                    onClick={() =>
                      exam.published || exam.isPublished
                        ? onUnpublish(exam._id)
                        : onPublish(exam._id)
                    }
                    disabled={
                      publishingExamId === exam._id ||
                      unpublishingExamId === exam._id
                    }
                  >
                    <span className="material-symbols-outlined">
                      {publishingExamId === exam._id ||
                      unpublishingExamId === exam._id
                        ? "hourglass_top"
                        : exam.published || exam.isPublished
                          ? "publish"
                          : "cloud_upload"}
                    </span>
                    {publishingExamId === exam._id
                      ? "Publishing..."
                      : unpublishingExamId === exam._id
                        ? "Unpublishing..."
                        : exam.published || exam.isPublished
                          ? "Published"
                          : "Draft"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editingExamId && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Edit exam"
          onClick={() => setEditingExamId(null)}
        >
          <article
            className="modal-panel panel panel--soft"
            style={{
              width: "min(92vw, 500px)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="inline-row inline-row--space"
              style={{ marginBottom: 8 }}
            >
              <h4 style={{ margin: 0 }}>Edit Exam</h4>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingExamId(null)}
                aria-label="Close edit exam"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {editMessage && <p style={{ color: "#065f46" }}>{editMessage}</p>}
            {editError && <p style={{ color: "#b91c1c" }}>{editError}</p>}

            <form className="stack" onSubmit={onUpdateExam}>
              <label>
                Title
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  className="input"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </label>
              <button className="button" type="submit">
                Save Changes
              </button>
            </form>
          </article>
        </div>
      )}

      {activeQuestion && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Question details"
          onClick={() => setActiveQuestionId(null)}
        >
          <article
            className="modal-panel panel panel--soft"
            style={{
              width: "min(92vw, 760px)",
              maxHeight: "88vh",
              overflow: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="inline-row inline-row--space"
              style={{ marginBottom: 8 }}
            >
              <h4 style={{ margin: 0 }}>Question Details</h4>
              <button
                type="button"
                className="icon-button"
                onClick={() => setActiveQuestionId(null)}
                aria-label="Close question details"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ marginTop: 0 }}>{activeQuestion.text}</p>
            <small className="muted">
              {(activeQuestion.subject || "General") +
                " • " +
                (activeQuestion.difficulty || "medium")}
            </small>

            {activeQuestion.imageUrl && (
              <img
                src={activeQuestion.imageUrl}
                alt="Question"
                style={{
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "contain",
                  background: "#f8fafc",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(195,198,215,0.6)",
                  marginTop: 10,
                }}
              />
            )}

            <ul className="list" style={{ marginTop: 10 }}>
              {activeQuestion.options.map((option, index) => (
                <li
                  key={`${activeQuestion._id}-${option.optionId}`}
                  className="list-item"
                >
                  <span>
                    {String.fromCharCode(65 + index)}. {option.text}
                  </span>
                  {option.isCorrect && (
                    <span className="badge badge--tertiary">Correct</span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        </div>
      )}
    </div>
  );
}
