import React from 'react';
import SectionLink from '../components/common/SectionLink';
import { versionList } from '../data/versions';

export default function HomePage() {
  return (
    <section className="page-section">
      <div className="section-heading-row">
        <div>
          <h2>Choose Version</h2>
          <p>Select the Lottery Defense version you want to use.</p>
        </div>
      </div>

      <div className="link-grid">
        {versionList.map((version) => (
          <SectionLink
            key={version.id}
            to={`/${version.id}`}
            title={version.label}
            description={
              version.status === 'working'
                ? 'Guides and calculator are available.'
                : 'Route is ready; content will be added when data is available.'
            }
          />
        ))}
      </div>
    </section>
  );
}
