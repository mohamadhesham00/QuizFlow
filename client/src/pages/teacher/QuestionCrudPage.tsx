import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createQuestion,
  deleteQuestionImage,
  deleteQuestion,
  listQuestionsPaginated,
  uploadQuestionImage,
  updateQuestion,
} from "../../lib/api";
import type { Question } from "../../types/api";

const defaultOptions = [
  { optionId: "A", text: "" },
  { optionId: "B", text: "" },
  { optionId: "C", text: "" },
  { optionId: "D", text: "" },
];

const subjectOptions = ["Databases", "Backend", "Frontend", "DevOps", "Basics"];

const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

export function QuestionCrudPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "" | "easy" | "medium" | "hard"
  >("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [category, setCategory] = useState("Basics");
  const [difficulty, setDifficulty] = useState("Medium");
  const [options, setOptions] = useState(
    defaultOptions.map((option) => ({
      ...option,
      isCorrect: option.optionId === "C",
    })),
  );

  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setQuestionText("");
    setCategory("Basics");
    setDifficulty("Medium");
    setOptions(
      defaultOptions.map((option) => ({
        ...option,
        isCorrect: option.optionId === "C",
      })),
    );
    setQuestionImageUrl("");
    setImageFile(null);
  };

  const fetchQuestions = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await listQuestionsPaginated({
        page: nextPage,
        limit,
        search: search.trim() || undefined,
        subject: subjectFilter.trim() || undefined,
        difficulty: difficultyFilter || undefined,
      });
      setQuestions(data.items);
      setTotal(data.pagination.total);
      setTotalPages(Math.max(1, data.pagination.totalPages));
      setPage(data.pagination.page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchQuestions(1);
  }, [search, subjectFilter, difficultyFilter]);

  const openCreateModal = () => {
    resetForm();
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (question: Question) => {
    setEditingId(question._id);
    setQuestionText(question.text);
    setCategory(question.subject || "Basics");
    setDifficulty(
      question.difficulty
        ? `${question.difficulty.charAt(0).toUpperCase()}${question.difficulty.slice(1)}`
        : "Medium",
    );
    setOptions(
      defaultOptions.map((baseOption, index) => {
        const existing = question.options[index];
        return {
          ...baseOption,
          text: existing?.text || "",
          isCorrect: Boolean(existing?.isCorrect),
        };
      }),
    );
    setQuestionImageUrl(question.imageUrl || "");
    setImageFile(null);
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError("");
    setImageFile(null);
  };

  const onUploadImage = async () => {
    if (!editingId || !imageFile) {
      return;
    }

    setImageBusy(true);
    setError("");
    setSuccess("");
    try {
      const updated = await uploadQuestionImage(editingId, imageFile);
      setQuestionImageUrl(updated.imageUrl || "");
      setImageFile(null);
      setSuccess("Question image uploaded successfully.");
      await fetchQuestions(page);
    } catch {
      setError("Could not upload question image. Please try again.");
    } finally {
      setImageBusy(false);
    }
  };

  const onRemoveImage = async () => {
    if (!editingId) {
      return;
    }

    setImageBusy(true);
    setError("");
    setSuccess("");
    try {
      await deleteQuestionImage(editingId);
      setQuestionImageUrl("");
      setImageFile(null);
      setSuccess("Question image removed successfully.");
      await fetchQuestions(page);
    } catch {
      setError("Could not remove question image. Please try again.");
    } finally {
      setImageBusy(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text: value } : item)),
    );
  };

  const setCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((item, i) => ({ ...item, isCorrect: i === index })),
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      text: questionText,
      subject: category,
      difficulty: difficulty.toLowerCase() as "easy" | "medium" | "hard",
      options: options.map((option) => ({
        text: option.text,
        isCorrect: Boolean(option.isCorrect),
      })),
    };

    try {
      if (editingId) {
        const updated = await updateQuestion(editingId, payload);

        if (imageFile) {
          const withImage = await uploadQuestionImage(updated._id, imageFile);
          setQuestionImageUrl(withImage.imageUrl || "");
          setImageFile(null);
        }

        setSuccess(
          imageFile
            ? "Question and image updated successfully."
            : "Question updated successfully.",
        );
      } else {
        const created = await createQuestion(payload);

        if (imageFile) {
          const withImage = await uploadQuestionImage(created._id, imageFile);
          setQuestionImageUrl(withImage.imageUrl || "");
          setImageFile(null);
        }

        setSuccess(
          imageFile
            ? "Question created and image uploaded successfully."
            : "Question created successfully.",
        );
      }

      closeModal();
      await fetchQuestions(page);
    } catch {
      setError(
        editingId
          ? "Could not update question. Please try again."
          : "Could not create question. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDeleteQuestion = async (questionId: string) => {
    setError("");
    setSuccess("");
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      await deleteQuestion(questionId);
      setSuccess("Question deleted successfully.");

      const nextPage = questions.length === 1 && page > 1 ? page - 1 : page;
      await fetchQuestions(nextPage);
    } catch {
      setError("Could not delete question. Please try again.");
    }
  };

  const pageInfo = useMemo(
    () => `Page ${page} of ${Math.max(1, totalPages)} • ${total} questions`,
    [page, totalPages, total],
  );

  const hasActiveFilters = Boolean(
    search.trim() || subjectFilter.trim() || difficultyFilter,
  );

  return (
    <div className="page-shell page-shell--wide app-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Question Manager</h1>
          <p className="page-subtitle">
            Create, edit, and delete questions with paginated browsing.
          </p>
        </div>
        <div className="toolbar">
          <button className="button" type="button" onClick={openCreateModal}>
            <span
              className="material-symbols-outlined"
              style={{ marginRight: 8 }}
            >
              add_circle
            </span>
            Add New Question
          </button>
        </div>
      </header>

      <section className="panel">
        {error && <p className="error">{error}</p>}
        {success && <p style={{ color: "#047857", margin: 0 }}>{success}</p>}

        <div className="panel panel--nested" style={{ marginBottom: 12 }}>
          <div className="inline-row" style={{ flexWrap: "wrap", gap: 10 }}>
            <input
              className="input"
              style={{ minWidth: 220, flex: 1 }}
              placeholder="Search by question text"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
            />
            <select
              className="select"
              style={{ minWidth: 180, flex: 1 }}
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              className="select"
              style={{ minWidth: 180 }}
              value={difficultyFilter}
              onChange={(event) => {
                setPage(1);
                setDifficultyFilter(
                  event.target.value as "" | "easy" | "medium" | "hard",
                );
              }}
            >
              <option value="">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              className="button button--secondary"
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setPage(1);
                setSearch("");
                setSubjectFilter("");
                setDifficultyFilter("");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        <div
          className="inline-row inline-row--space"
          style={{ marginBottom: 12 }}
        >
          <h3 className="font-headline" style={{ margin: 0 }}>
            Questions
          </h3>
          <small className="muted">{pageInfo}</small>
        </div>

        <ul className="list">
          {loading ? (
            <li className="list-item list-item--panel">Loading questions...</li>
          ) : questions.length === 0 ? (
            <li className="list-item list-item--panel">No questions found.</li>
          ) : (
            questions.map((question) => (
              <li key={question._id} className="list-item list-item--panel">
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{question.text}</p>
                  <small className="muted">
                    {question.subject || "General"} •{" "}
                    {question.difficulty || "medium"}
                  </small>
                  <div
                    className="inline-row"
                    style={{ marginTop: 8, flexWrap: "wrap" }}
                  >
                    {question.options.map((option) => (
                      <span
                        key={`${question._id}-${option.optionId}`}
                        className={`badge ${option.isCorrect ? "badge--tertiary" : "badge--surface"}`}
                      >
                        {getOptionLabel(question.options.indexOf(option))}.{" "}
                        {option.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="inline-row">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => openEditModal(question)}
                  >
                    Edit
                  </button>
                  <button
                    className="button button--danger"
                    type="button"
                    onClick={() => void onDeleteQuestion(question._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="inline-row inline-row--space" style={{ marginTop: 14 }}>
          <button
            className="button button--secondary"
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void fetchQuestions(page - 1)}
          >
            Previous Page
          </button>
          <small className="muted">{pageInfo}</small>
          <button
            className="button"
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => void fetchQuestions(page + 1)}
          >
            Next Page
          </button>
        </div>
      </section>

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-crud-modal-title"
        >
          <form className="modal-panel" onSubmit={onSubmit}>
            <div className="modal-header inline-row inline-row--space">
              <div>
                <h3
                  id="question-crud-modal-title"
                  className="font-headline"
                  style={{ margin: 0, fontSize: "1.55rem", fontWeight: 800 }}
                >
                  {editingId ? "Edit Question" : "Add New Question"}
                </h3>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  {editingId
                    ? "Update this question details."
                    : "Create a single multiple-choice question for the bank."}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeModal}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="stack" style={{ gap: 14 }}>
                <label>
                  <span className="field-label">Question Prompt</span>
                  <textarea
                    className="textarea"
                    placeholder="Type your question here..."
                    value={questionText}
                    onChange={(event) => setQuestionText(event.target.value)}
                    required
                  />
                </label>

                <div className="stack" style={{ gap: 8 }}>
                  <span className="field-label">Question Image</span>
                  {questionImageUrl ? (
                    <button
                      type="button"
                      className="image-preview-frame"
                      onClick={() => setPreviewImage(questionImageUrl)}
                      aria-label="Expand question image"
                    >
                      <img
                        src={questionImageUrl}
                        alt="Question"
                        className="zoomable-image"
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "contain",
                          background: "#f8fafc",
                          padding: 8,
                          borderRadius: 12,
                          border: "1px solid rgba(195,198,215,0.6)",
                        }}
                      />
                    </button>
                  ) : (
                    <p className="muted" style={{ margin: 0 }}>
                      No image attached.
                    </p>
                  )}

                  {questionImageUrl && (
                    <small className="muted">
                      Hover to zoom • Click to expand
                    </small>
                  )}

                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setImageFile(event.target.files?.[0] || null)
                    }
                  />

                  <div className="inline-row" style={{ flexWrap: "wrap" }}>
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!editingId || !imageFile || imageBusy}
                      onClick={() => void onUploadImage()}
                    >
                      {imageBusy ? "Uploading..." : "Upload Image"}
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      disabled={!editingId || !questionImageUrl || imageBusy}
                      onClick={() => void onRemoveImage()}
                    >
                      {imageBusy ? "Removing..." : "Remove Image"}
                    </button>
                  </div>

                  {!editingId && imageFile && (
                    <p className="muted" style={{ margin: 0 }}>
                      Image will be uploaded automatically after creating the
                      question.
                    </p>
                  )}
                </div>
              </div>

              <div className="stack" style={{ gap: 12 }}>
                <span className="field-label">Options & Correct Answer</span>
                <div className="options-grid">
                  {options.map((option, index) => (
                    <div key={option.optionId} className="option-row">
                      <button
                        className={`option-pill${option.isCorrect ? " option-pill--selected" : ""}`}
                        type="button"
                        onClick={() => setCorrect(index)}
                        aria-label={`Mark option ${getOptionLabel(index)} as correct`}
                      >
                        {getOptionLabel(index)}
                      </button>
                      <input
                        className="option-input"
                        placeholder={`Enter option ${getOptionLabel(index)}...`}
                        value={option.text}
                        onChange={(event) =>
                          updateOption(index, event.target.value)
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-grid-two">
                <label>
                  <span className="field-label">Category</span>
                  <select
                    className="select"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option>Databases</option>
                    <option>Backend</option>
                    <option>Frontend</option>
                    <option>DevOps</option>
                    <option>Basics</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">Difficulty</span>
                  <select
                    className="select"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="button button--secondary"
                type="button"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="button button--gradient"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? editingId
                    ? "Updating..."
                    : "Saving..."
                  : editingId
                    ? "Update Question"
                    : "Save Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {previewImage && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded question image"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="modal-panel"
            style={{ width: "min(96vw, 980px)", padding: 12 }}
          >
            <img
              src={previewImage}
              alt="Expanded question"
              style={{
                width: "100%",
                maxHeight: "86vh",
                objectFit: "contain",
                borderRadius: 12,
                background: "#0f172a",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
