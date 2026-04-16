import { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { getAttemptResult, listStudentAttempts } from "../../lib/api";
import axios from "axios";
import type { AttemptSummary, SubmitAttemptResponse } from "../../types/api";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function StudentResultPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const attemptIdFromQuery = params.get("attemptId");
  const stateResult = location.state as SubmitAttemptResponse | undefined;
  const attemptIdFromState =
    (location.state as { attemptId?: string } | undefined)?.attemptId ?? null;
  const [resolvedAttemptId, setResolvedAttemptId] = useState<string | null>(
    attemptIdFromQuery || attemptIdFromState || stateResult?.attemptId || null,
  );

  const [result, setResult] = useState<SubmitAttemptResponse | undefined>(
    stateResult,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notSubmittedYet, setNotSubmittedYet] = useState(false);
  const [submittedAttempts, setSubmittedAttempts] = useState<AttemptSummary[]>(
    [],
  );
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  useEffect(() => {
    const id =
      attemptIdFromQuery ||
      attemptIdFromState ||
      stateResult?.attemptId ||
      null;
    if (id) {
      setResolvedAttemptId(id);
    } else {
      setResolvedAttemptId(null);
      setResult(undefined);
    }
  }, [attemptIdFromQuery, attemptIdFromState, stateResult?.attemptId]);

  useEffect(() => {
    if (resolvedAttemptId || stateResult) {
      return;
    }

    const loadSubmittedAttempts = async () => {
      setAttemptsLoading(true);
      try {
        const attempts = await listStudentAttempts();
        setSubmittedAttempts(
          [...attempts]
            .filter((item) => item.status === "submitted")
            .sort(
              (a, b) =>
                new Date(b.submittedAt || b.startedAt).getTime() -
                new Date(a.submittedAt || a.startedAt).getTime(),
            ),
        );
      } catch {
        setSubmittedAttempts([]);
      } finally {
        setAttemptsLoading(false);
      }
    };

    void loadSubmittedAttempts();
  }, [resolvedAttemptId, stateResult]);

  useEffect(() => {
    if (stateResult) {
      setResult(stateResult);
      return;
    }

    if (!resolvedAttemptId) {
      return;
    }

    const run = async () => {
      setLoading(true);
      setError("");
      setNotSubmittedYet(false);
      try {
        const data = await getAttemptResult(resolvedAttemptId);
        setResult(data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 400) {
          setNotSubmittedYet(true);
          setError("This attempt is still in progress and has no result yet.");
        } else {
          setError("Could not load result for this attempt.");
        }
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [resolvedAttemptId, stateResult]);

  const safeResult = useMemo(() => {
    if (!result) {
      return undefined;
    }

    return {
      attemptId: result.attemptId,
      score: Number(result.score) || 0,
      total: Number(result.total) || 0,
      percentage: Number(result.percentage) || 0,
      solvingTimeSeconds: Number(result.solvingTimeSeconds) || 0,
    } as SubmitAttemptResponse;
  }, [result]);

  if (loading) {
    return (
      <section className="panel">
        <h2>Loading result...</h2>
      </section>
    );
  }

  if (!safeResult) {
    return (
      <section className="panel">
        <h2>
          {resolvedAttemptId
            ? "No submission result available"
            : "Select an attempt result"}
        </h2>
        {!resolvedAttemptId && attemptsLoading && (
          <p className="muted">Loading your submitted attempts...</p>
        )}
        {!resolvedAttemptId &&
          !attemptsLoading &&
          submittedAttempts.length > 0 && (
            <ul className="list" style={{ marginBottom: 12 }}>
              {submittedAttempts.map((attempt) => (
                <li key={attempt._id} className="list-item">
                  <div>
                    <p>Attempt #{attempt._id.slice(-6)}</p>
                    <small className="muted">
                      {attempt.examTitle ? `${attempt.examTitle} • ` : ""}
                      {new Date(
                        attempt.submittedAt || attempt.startedAt,
                      ).toLocaleString()}
                    </small>
                  </div>
                  <Link
                    className="button button--secondary"
                    to={`/student/result?attemptId=${attempt._id}`}
                  >
                    View result
                  </Link>
                </li>
              ))}
            </ul>
          )}
        <p className="muted">
          {error ||
            (!resolvedAttemptId
              ? "Open one of your submitted attempts to view its result."
              : "Submit an exam to see instant feedback.")}
        </p>
        {notSubmittedYet && resolvedAttemptId && (
          <Link
            className="button button--secondary"
            to={`/student/live?attemptId=${resolvedAttemptId}`}
          >
            Continue this attempt
          </Link>
        )}
        <Link className="button" to="/student">
          Back to portal
        </Link>
      </section>
    );
  }

  return (
    <section className="panel stack">
      <h2>Submission complete</h2>
      <p className="muted">Instant feedback generated by backend scoring.</p>

      <div className="grid-three">
        <article className="metric-card">
          <small>Score</small>
          <h3>
            {safeResult.score}/{safeResult.total}
          </h3>
        </article>

        <article className="metric-card">
          <small>Percentage</small>
          <h3>{safeResult.percentage.toFixed(2)}%</h3>
        </article>

        <article className="metric-card">
          <small>Solving time</small>
          <h3>{formatDuration(safeResult.solvingTimeSeconds)}</h3>
        </article>
      </div>

      <Link className="button" to="/student">
        Go to student portal
      </Link>
    </section>
  );
}
