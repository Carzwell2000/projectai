import { FiArrowLeft } from 'react-icons/fi'
import AssessmentResult from './AssessmentResult'

function AssessmentResultPage({ result, explanation, explanationPending, explanationError, onNavigate, isPrimaryHealthcare }) {
  return (
    <div className="page-stack assessment-result-page">
      <button className="text-button" type="button" onClick={() => onNavigate('assessment')}>
        <FiArrowLeft aria-hidden="true" /> Back to assessment
      </button>
      <div className="decision-support-note" role="note">
        <span aria-hidden="true" className="result-note-mark">i</span>
        <p><strong>Decision support for clinician review</strong><span>Possible disease matches and triage guidance are based on the information entered. They are not a diagnosis or a treatment plan. A qualified healthcare professional should review the findings and decide next steps.</span></p>
      </div>
      <AssessmentResult
        result={result}
        explanation={explanation}
        explanationPending={explanationPending}
        explanationError={explanationError}
        isPrimaryHealthcare={isPrimaryHealthcare}
      />
    </div>
  )
}

export default AssessmentResultPage
