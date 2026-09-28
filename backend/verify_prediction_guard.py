import numpy as np
import main

orig = main.classifier.predict_proba
main.classifier.predict_proba = lambda X: np.array([[0.34, 0.33, 0.33]])
result = main.predict_assessment('fever', 37.0)
assert result['status'] == 'low_confidence', result
assert result['disease'] == 'Insufficient evidence', result
assert result['confidence'] == 0.0, result
main.classifier.predict_proba = orig
print('prediction-check: ok')
