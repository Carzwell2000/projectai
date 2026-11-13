function DiseaseExplanationCard({ disease, showClinicalDetails = true, isPrimaryHealthcare = false }) {
  const features = disease.features || []
  const maximumContribution = Math.max(
    ...features.map((feature) => Math.abs(feature.contribution)),
    1,
  )

  return (
    <article className="disease-explanation-card">
      <header className="disease-explanation-heading">
        <h3>{disease.disease}</h3>
        <span className="disease-confidence">
          {Math.round((disease.confidence || 0) * 100)}%
        </span>
      </header>

      {showClinicalDetails && disease.recommendation && (
        <div className="disease-recommendation">
          <p className="eyebrow tiny">RECOMMENDATION</p>
          <p>{disease.recommendation}</p>
        </div>
      )}

      {features.length > 0 && (
        <>
        <p className="disease-why">{isPrimaryHealthcare ? 'Why was this disease predicted?' : 'Why predicted this'}</p>
        <ul className="disease-feature-list">
          {features.map((feature) => {
            const impact = Math.max(
              8,
              Math.round((Math.abs(feature.contribution) / maximumContribution) * 100),
            )
            const direction = feature.direction === 'supports' ? 'supports' : 'opposes'
            const label = feature.feature.replaceAll('_', ' ')

            return (
              <li className="disease-feature" key={`${feature.feature}-${feature.contribution}`}>
                <div className="disease-feature-heading">
                  <strong>{label}</strong>
                  <span className={`feature-direction ${direction}`}>
                    {direction === 'supports' ? 'Supports' : 'Opposes'}
                  </span>
                </div>
                <div
                  className="disease-feature-track"
                  role="meter"
                  aria-label={`${label} relative contribution`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={impact}
                >
                  <span className={`disease-feature-bar ${direction}`} style={{ width: `${impact}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        </>
      )}
    </article>
  )
}

export default DiseaseExplanationCard
