import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SectionLink from '../../components/common/SectionLink';
import { getVersionConfig } from '../../data/versions';

export default function RegionPage() {
  const { versionId } = useParams();
  const versionConfig = getVersionConfig(versionId);

  if (!versionConfig) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="page-section">
      <div className="breadcrumb-row">
        <Link to="/">Versions</Link>
        <span>/</span>
        <span>{versionConfig.label}</span>
      </div>

      <div className="section-heading-row">
        <div>
          <h2>{versionConfig.name}</h2>
          <p>Choose what you want to open.</p>
        </div>
      </div>

      <div className="link-grid">
        <SectionLink
          to={`/${versionConfig.id}/guides`}
          title="Guides"
          description={
            versionConfig.status === 'working'
              ? 'Open the available EUNA guide notes.'
              : 'Placeholder until KR guide data is ready.'
          }
        />
        <SectionLink
          to={`/${versionConfig.id}/calculator`}
          title="Calculator"
          description={
            versionConfig.status === 'working'
              ? 'Open the working EUNA calculator.'
              : 'Placeholder until KR calculator data is ready.'
          }
        />
      </div>
    </section>
  );
}
