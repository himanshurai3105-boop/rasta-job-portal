import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-full hover:bg-paper/10 transition-colors focus-ring"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setMenuOpen(false);

  const links = [
    { to: "/jobs", label: "Browse jobs", show: true },
    { to: "/salary-insights", label: "Salary insights", show: true },
    { to: "/recommended", label: "For you", show: user?.role === "jobseeker" },
    { to: "/employer/post", label: "Post a job", show: user?.role === "employer" },
    { to: "/employer/dashboard", label: "My postings", show: user?.role === "employer" },
    { to: "/saved", label: "Saved jobs", show: user?.role === "jobseeker" },
    { to: "/applications", label: "My applications", show: user?.role === "jobseeker" },
    { to: "/admin", label: "Admin", show: user?.role === "admin" },
    { to: "/profile", label: "Profile", show: !!user },
  ].filter((l) => l.show);

  return (
    <header className="sticky top-0 z-50 bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-tight" onClick={closeMenu}>
          rasta<span className="text-amber">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-amber transition-colors focus-ring rounded">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <Link to="/profile" className="text-sm text-paper/70 hover:text-amber transition-colors focus-ring rounded">
                {user.name?.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 rounded-full border border-paper/20 hover:border-amber hover:text-amber transition-colors focus-ring"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-amber transition-colors focus-ring rounded">
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-4 py-2 rounded-full bg-amber text-ink hover:bg-amber-dark transition-colors focus-ring"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme toggle + bell + menu toggle */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          {user && <NotificationBell />}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="p-2 -mr-2 focus-ring rounded"
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 bg-paper transition-transform duration-200 ${
                  menuOpen ? "translate-y-[9px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 bg-paper transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 bg-paper transition-transform duration-200 ${
                  menuOpen ? "-translate-y-[9px] -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          menuOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <nav className="px-6 pb-4 flex flex-col gap-1 border-t border-paper/10 pt-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={closeMenu}
              className="py-2.5 text-sm font-medium hover:text-amber transition-colors focus-ring rounded"
            >
              {l.label}
            </Link>
          ))}

          <div className="h-px bg-paper/10 my-2" />

          {user ? (
            <>
              <span className="py-1 text-sm text-paper/50">Signed in as {user.name}</span>
              <button
                onClick={handleLogout}
                className="mt-2 py-2.5 text-sm font-medium text-left hover:text-amber transition-colors focus-ring rounded"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className="py-2.5 text-sm font-medium hover:text-amber transition-colors focus-ring rounded">
                Log in
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className="mt-2 text-center py-2.5 text-sm font-medium rounded-full bg-amber text-ink hover:bg-amber-dark transition-colors focus-ring"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
