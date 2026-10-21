/**
 * Conceptual grouping of the interlock demo's inputs for its diagram. Pure and client-safe;
 * the emission decision itself is always emissionPermitted() from the Machine Explorer model,
 * and tests/unit/architecture.test.ts checks that the grouping can never disagree with it.
 *
 * Grouping (platform drawing, not a functional-safety design):
 * - key switch, emergency stop and door interlock feed the safety PLC / relay, as in the
 *   handbook's §11.6 safety-architecture figure; its output is the hard-wired emission enable (§12.4);
 * - fume extraction is one of the §12.5 process interlocks, drawn with the PLC job sequence.
 */
import { emissionPermitted, type InterlockState } from "@/features/machine-explorer/machineData";

export interface InterlockView {
  /** key switch on, E-stop released and door closed */
  safetyChainOk: boolean;
  /** fume extraction running */
  processOk: boolean;
  /** process interlocks OK and a job started by the PLC */
  gateOk: boolean;
  emission: { ok: boolean; reasons: string[] };
}

export function interlockView(s: InterlockState): InterlockView {
  const safetyChainOk = s.keyOn && s.estopReleased && s.doorClosed;
  const processOk = s.extractionOn;
  return { safetyChainOk, processOk, gateOk: processOk && s.running, emission: emissionPermitted(s) };
}
