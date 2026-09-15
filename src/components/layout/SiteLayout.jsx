import React from 'react';
import { NavLink } from 'react-router-dom';

export default function SiteLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <h1>Lottery Defense</h1>
          <p className="site-subtitle">Guides and calculators by version</p>
        </div>
        <nav className="top-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Versions
          </NavLink>
        </nav>
      </header>

      <main className="page-content">{children}</main>
    </div>
  );
}
