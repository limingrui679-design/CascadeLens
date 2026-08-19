import capabilityMatrix from "@/content/cases/capability-matrix.json";

export function CapabilityMatrix() {
  return (
    <div className="capability-matrix-wrap">
      <table className="capability-matrix">
        <caption>
          A filled cell means the case includes an executable user task for that capability. It does not establish external validation or expertise.
        </caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            {capabilityMatrix.capabilities.map((capability) => (
              <th key={capability.id} scope="col" title={capability.description}>
                {capability.shortLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capabilityMatrix.cases.map((item) => (
            <tr key={item.slug}>
              <th scope="row">
                <span>{item.shortTitle}</span>
                <small>{item.domain}</small>
              </th>
              {capabilityMatrix.capabilities.map((capability) => {
                const included = item.decisionProfile.capabilities.includes(capability.id);
                return (
                  <td key={capability.id}>
                    <span
                      aria-label={`${capability.label}: ${included ? "included" : "not a primary task"}`}
                      className={included ? "capability-dot active" : "capability-dot"}
                    >
                      {included ? "●" : "·"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

