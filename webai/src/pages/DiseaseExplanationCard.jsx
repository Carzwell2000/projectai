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
          {isPrimaryHealthcare ? 'Model confidence ' : ''}{Math.round((disease.confidence || 0) * 100)}%
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
        <p className="disease-why">{isPrimaryHealthcare ? 'Why the model suggested this' : 'Model factors'}</p>
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
                    {isPrimaryHealthcare
                      ? direction === 'supports' ? 'Pushed toward match' : 'Pushed away from match'
                      : direction === 'supports' ? 'Supports' : 'Opposes'}
                  </span>
                </div>
                <div
                  className="disease-feature-track"
                  role="meter"
                  aria-label={`${label} relative model contribution`}
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
        {isPrimaryHealthcare && (
          <p className="disease-explanation-note">
            These recorded factors influenced the model, but do not confirm a disease. Bar lengths compare factors within this result; they are not measures of risk.
          </p>
        )}
        </>
      )}
    </article>
  )
}

export default DiseaseExplanationCard
