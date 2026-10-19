import { FiArrowLeft } from 'react-icons/fi'
import AssessmentResult from './AssessmentResult'

function AssessmentResultPage({ result, explanation, explanationPending, explanationError, onNavigate, isPrimaryHealthcare }) {
  return (
    <div className="page-stack assessment-result-page">
      <button className="text-button" type="button" onClick={() => onNavigate('assessment')}>
        <FiArrowLeft aria-hidden="true" /> Back to assessment
      </button>
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