import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SiteLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <h1>Prismatic's Website</h1>
          <p className="site-subtitle">All of my website projects</p>
        </div>
        <nav className="top-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/lottery-defense">Lottery Defense</NavLink>
        </nav>
      </header>

      <main className="page-content">{children}</main>
    </div>
  );
}
