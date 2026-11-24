// The agent-plan banner, re-homed from the retired legacy DesignSystem.jsx
// library (#255); its labels come from the message catalogue (#284).
import { useMessages } from "../i18n/index.js";

export default function AgentPlan({ steps, error = false }) {
  const t = useMessages();
  const list = Array.isArray(steps) ? steps : steps ? [steps] : [];
  return (
    <div role="status" className={`ui-agent-plan ${error ? "ui-agent-plan--error" : ""}`}>
      {list.length === 1 ? (
        <p>{t.rich("agentPlan.action", { action: list[0].action })}</p>
      ) : (
        <>
          <p className="ui-agent-plan-title">{t("agentPlan.plan")}</p>
          <ol>
            {list.map((step, index) => (
              <li key={index}>
                <strong>{step.action}</strong>
                {step.parameters && Object.keys(step.parameters).length > 0 && (
                  <span>
                    (
                    {Object.entries(step.parameters)
                      .map(([key, value]) => `${key}: "${value}"`)
                      .join(", ")}
                    )
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
