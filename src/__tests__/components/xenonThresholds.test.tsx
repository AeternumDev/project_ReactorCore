import { describe, expect, test } from "@jest/globals";
import { getMnemonicXenonColor } from "@/components/cockpit/MnemonicBoard";
import { getSynopticXenonWarningState } from "@/components/cockpit/SynopticDiagram";
import { PHYSICS } from "@/lib/physics/constants";

describe("Xenon cockpit thresholds", () => {
  test("normal equilibrium xenon is not shown as a pit alarm", () => {
    expect(getMnemonicXenonColor(PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION)).toBe("var(--safe-green)");
    expect(getSynopticXenonWarningState(PHYSICS.XENON_EQUILIBRIUM_CONCENTRATION)).toEqual({
      warnXenon: false,
      critXenon: false,
    });
  });

  test("pit and severe pit thresholds share the physics constants", () => {
    expect(getMnemonicXenonColor(PHYSICS.XENON_WARNING_CONCENTRATION + 0.01)).toBe("var(--warning-yellow)");
    expect(getSynopticXenonWarningState(PHYSICS.XENON_WARNING_CONCENTRATION + 0.01)).toEqual({
      warnXenon: true,
      critXenon: false,
    });

    expect(getMnemonicXenonColor(PHYSICS.XENON_SEVERE_CONCENTRATION + 0.01)).toBe("var(--alarm-red)");
    expect(getSynopticXenonWarningState(PHYSICS.XENON_SEVERE_CONCENTRATION + 0.01)).toEqual({
      warnXenon: true,
      critXenon: true,
    });
  });
});