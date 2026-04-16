import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuth, getCurrentUser } from "../../lib/auth";
import { useState, type PropsWithChildren } from "react";
import { logoutSession } from "../../lib/api";

type ShellNavItem = {
  to: string;
  label: string;
  end?: boolean;
};

const teacherNav: ShellNavItem[] = [
  { to: "/teacher/questions/manage", label: "Manage Questions" },
  { to: "/teacher/exams", label: "Exam Builder" },
  { to: "/teacher/results", label: "Results & Export" },
];

const studentNav: ShellNavItem[] = [
  { to: "/student", label: "Student Portal", end: true },
  { to: "/student/live", label: "Live Exam" },
  { to: "/student/result", label: "Result" },
];

export function AppShell({ children }: PropsWithChildren) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const nav = user?.role === "teacher" ? teacherNav : studentNav;
  const [profileOpen, setProfileOpen] = useState(false);

  const onLogout = async () => {
    try {
      await logoutSession();
    } catch {
      // best effort logout, local cleanup still runs
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  return (
    <div className="app-frame">
      <header className="app-topbar glass-header">
        <div className="topbar-brand">
          <span className="brand-name">Academic Sanctuary</span>
          <span className="brand-subtitle">Exam Management</span>
        </div>
        <div className="topbar-actions">
          <div className="profile-menu-wrap">
            <button
              className="avatar-chip avatar-chip--button"
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Open profile menu"
            >
              {user?.fullName?.charAt(0)?.toUpperCase() ?? "Q"}
            </button>

            {profileOpen && (
              <div
                className="profile-menu"
                role="menu"
                aria-label="Profile menu"
              >
                <div className="profile-menu__header">
                  <strong>{user?.fullName ?? "User"}</strong>
                  <small>{user?.email ?? ""}</small>
                </div>
                <button
                  className="profile-menu__action"
                  type="button"
                  onClick={onLogout}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="app-sidebar">
        <div className="sidebar-brand-block">
          <h1>
            {user?.role === "teacher" ? "Faculty Portal" : "Student Portal"}
          </h1>
          <p>{user?.fullName ?? "Guest"}</p>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean(item.end)}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link className="sidebar-help" to="/">
            Home
          </Link>
          <button
            className="button button--gradient"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="app-content">{children}</section>
    </div>
  );
}
