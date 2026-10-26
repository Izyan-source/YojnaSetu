// Evaluation-only bridge to the same deterministic explanation builder used by the UI.
import { explainEligibility, createExplanationContext } from '../frontend/src/eligibilityExplanations.js'
let input = ''
for await (const part of process.stdin) input += part
const { result, context } = JSON.parse(input)
process.stdout.write(JSON.stringify(explainEligibility(result, createExplanationContext(context))))
