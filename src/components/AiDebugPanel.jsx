import React from "react";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-3 py-2">
      <div className="text-white/55">{label}</div>
      <div className="font-mono text-sm text-white/90 break-all text-right">
        {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function AiDebugPanel({
  isOpen,
  onToggle,
  ai,
  inputs,
  models,
  profile,
  releaseMode,
}) {
  return (
    <div className="rounded-[30px] border border-cyan-400/20 bg-cyan-400/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-black text-white">AI Debug Panel</div>
          <div className="text-sm text-white/55">
            Founder-only tekninen näkymä
          </div>
        </div>

        <button
          onClick={onToggle}
          className="rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 font-bold text-white"
        >
          {isOpen ? "Piilota" : "Näytä"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Section title="Inputs">
            <Row label="gap" value={inputs.gap} />
            <Row label="momentum" value={inputs.momentum} />
            <Row label="visibility" value={inputs.visibility} />
            <Row label="boostsUsed" value={inputs.boostsUsed} />
            <Row label="selectedType" value={inputs.selectedType} />
            <Row label="rank" value={inputs.rank} />
            <Row label="releaseMode" value={releaseMode} />
          </Section>

          <Section title="Profile">
            <Row label="reactsToLoss" value={profile.reactsToLoss?.toFixed?.(2) ?? profile.reactsToLoss} />
            <Row label="reactsToAlmostWin" value={profile.reactsToAlmostWin?.toFixed?.(2) ?? profile.reactsToAlmostWin} />
            <Row label="reactsToMomentum" value={profile.reactsToMomentum?.toFixed?.(2) ?? profile.reactsToMomentum} />
            <Row label="paysInCriticalMoments" value={profile.paysInCriticalMoments?.toFixed?.(2) ?? profile.paysInCriticalMoments} />
            <Row label="ignoresOffers" value={profile.ignoresOffers?.toFixed?.(2) ?? profile.ignoresOffers} />
          </Section>

          <Section title="Effective Models">
            <Row label="optimization.aggressiveness" value={models.optimization?.aggressiveness} />
            <Row label="optimization.priceBias" value={models.optimization?.priceBias} />
            <Row label="optimization.highThreshold" value={models.optimization?.highThreshold} />
            <Row label="optimization.mediumThreshold" value={models.optimization?.mediumThreshold} />
            <Row label="optimization.softThreshold" value={models.optimization?.softThreshold} />
            <Row label="economy.priceModifier" value={models.economy?.priceModifier} />
            <Row label="economy.boostStrengthMultiplier" value={models.economy?.boostStrengthMultiplier} />
            <Row label="economy.visibilityMultiplier" value={models.economy?.visibilityMultiplier} />
            <Row label="economy.urgencyBias" value={models.economy?.urgencyBias} />
            <Row label="economy.fairnessGuard" value={models.economy?.fairnessGuard} />
          </Section>

          <Section title="Boost Decision">
            <Row label="score" value={ai.boost?.score} />
            <Row label="urgency" value={ai.boost?.urgency} />
            <Row label="showBoost" value={ai.boost?.showBoost} />
            <Row label="recommendedPrice" value={ai.boost?.recommendedPrice} />
            <Row label="estimatedMomentumGain" value={ai.boost?.estimatedMomentumGain} />
            <Row label="estimatedVisibilityGain" value={ai.boost?.estimatedVisibilityGain} />
            <Row label="message" value={ai.boost?.message} />
          </Section>

          <Section title="Visibility Decision">
            <Row label="score" value={ai.visibility?.score} />
            <Row label="visibilityIntent" value={ai.visibility?.visibilityIntent} />
            <Row label="visibilityMultiplier" value={ai.visibility?.visibilityMultiplier} />
            <Row label="visibilityMessage" value={ai.visibility?.visibilityMessage} />
          </Section>

          <Section title="Autopilot">
            <Row label="recommendedMode" value={ai.autopilot?.recommendedMode} />
            <Row label="automationAction" value={ai.autopilot?.automationAction} />
            <Row label="autopilotReason" value={ai.autopilot?.autopilotReason} />
            <Row label="autopilotConfidence" value={ai.autopilot?.autopilotConfidence} />
          </Section>

          <Section title="Runtime">
            <Row label="health" value={ai.runtime?.health} />
            <Row label="lastAlert" value={ai.runtime?.lastAlert} />
            <Row label="recommendedAction" value={ai.runtime?.recommendedAction} />
            <Row label="ignoreRate" value={ai.runtime?.ignoreRate} />
            <Row label="purchaseRate" value={ai.runtime?.purchaseRate} />
            <Row label="clickRate" value={ai.runtime?.clickRate} />
            <Row label="growthModeActive" value={ai.runtime?.growthModeActive} />
          </Section>

          <Section title="Raw JSON">
            <pre className="overflow-auto rounded-xl bg-white/5 p-3 text-xs text-white/75">
              {JSON.stringify({ ai, inputs, models, profile, releaseMode }, null, 2)}
            </pre>
          </Section>
        </div>
      ) : null}
    </div>
  );
}
