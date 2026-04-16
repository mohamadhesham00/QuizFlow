import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../lib/api";
import { setAuth } from "../../lib/auth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login({ email, password });
      setAuth(response.token, response.user);
      navigate(
        response.user.role === "teacher"
          ? "/teacher/questions/manage"
          : "/student",
      );
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--premium">
      <div className="auth-hero">
        <div className="auth-hero__content">
          <span className="auth-badge">Academic Sanctuary</span>
          <h1>QuizFlow</h1>
          <p>
            Build fair exams, deliver shuffled forms, and track real student
            performance with timed attempts.
          </p>
          <ul>
            <li>Teacher dashboard with question management</li>
            <li>4 shuffled exam forms per exam</li>
            <li>Instant student feedback and timing</li>
          </ul>
        </div>
      </div>

      <form
        className="panel auth-panel auth-panel--premium"
        onSubmit={onSubmit}
      >
        <div className="auth-panel__head">
          <h2>Welcome back</h2>
          <p className="muted">Sign in to continue to your workspace.</p>
        </div>

        <label>
          <span className="field-label">Email address</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.edu"
            required
          />
        </label>

        <label>
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button
          className="button button--gradient"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
