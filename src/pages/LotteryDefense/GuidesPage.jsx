import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getVersionConfig } from '../../data/versions';

export default function GuidesPage() {
  const { versionId } = useParams();
  const versionConfig = getVersionConfig(versionId);

  if (!versionConfig) {
    return <Navigate to="/" replace />;
  }

  if (!versionConfig.guides.length) {
    return (
      <section className="placeholder-page">
        <h2>{versionConfig.label} Guides</h2>
        <p>Guide data for this version is not ready yet.</p>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="breadcrumb-row">
        <Link to="/">Versions</Link>
        <span>/</span>
        <Link to={`/${versionConfig.id}`}>{versionConfig.label}</Link>
        <span>/</span>
        <span>Guides</span>
      </div>

      <div className="section-heading-row">
        <div>
          <h2>{versionConfig.label} Guides</h2>
          <p>Version-specific guide notes for Lottery Defense.</p>
        </div>
      </div>

      <div className="link-grid">
        {versionConfig.guides.map((guide) => (
          <article className="section-link" key={guide.id}>
            <h3>{guide.title}</h3>
            <p>{guide.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
