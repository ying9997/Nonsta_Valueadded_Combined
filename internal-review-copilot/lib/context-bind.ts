import type { AgentInput, ContextFacts, OwnerFacts } from "./types.ts";

/**
 * Bind already-known OMS / page facts so later nodes do not re-ask them.
 * Generic: does not assume F-001.
 */
export function bindContext(input: AgentInput): { contextFacts: ContextFacts; ownerFacts: OwnerFacts } {
  const boundKeys: string[] = [];
  const push = (key: string, ok: boolean) => {
    if (ok) boundKeys.push(key);
  };

  push("eventNo", Boolean(input.pageContext.eventNo || (input.enrichedContext.allEventNos as string[] | undefined)?.length));
  push("businessOrderNo", Boolean(input.pageContext.businessOrderNo || (input.enrichedContext.allBusinessOrderNos as string[] | undefined)?.length));
  push("warehouseCode", Boolean(input.pageContext.warehouseCode || input.pageContext.warehouseName));
  push("customerCode", Boolean(input.pageContext.customerCode || input.pageContext.customerName));
  push("VAS_ATTR_REL_NWEON", Boolean(input.providedFields.VAS_ATTR_REL_NWEON));
  push("NSVASTN", Boolean(input.providedFields.NSVASTN));
  for (const [field, status] of Object.entries(input.pageContext.attachmentStatus)) {
    if (status === "uploaded") boundKeys.push(field);
  }

  const allEventNos = [
    ...new Set(
      [input.pageContext.eventNo, ...((input.enrichedContext.allEventNos as string[]) || [])].filter(Boolean),
    ),
  ];
  const allBusinessOrderNos = [
    ...new Set(
      [input.pageContext.businessOrderNo, ...((input.enrichedContext.allBusinessOrderNos as string[]) || [])].filter(Boolean),
    ),
  ];

  return {
    contextFacts: {
      orderNo: input.vascNo,
      customerCode: input.pageContext.customerCode,
      customerName: input.pageContext.customerName,
      warehouseCode: input.pageContext.warehouseCode,
      warehouseName: input.pageContext.warehouseName,
      eventNo: allEventNos[0] || "",
      businessOrderNo: allBusinessOrderNos[0] || "",
      allEventNos,
      allBusinessOrderNos,
      vaSource: input.pageContext.vaSource,
      sceneKey: input.sceneKey,
      sceneName: input.sceneName,
      sceneCode: input.sceneCode,
      serviceAtom: input.serviceAtom,
      attachmentStatus: input.pageContext.attachmentStatus,
      providedFields: input.providedFields,
      boundKeys,
    },
    ownerFacts: {
      submittedBy: input.responsiblePeople.submittedBy,
      customerService: input.responsiblePeople.customerService,
      sales: input.responsiblePeople.sales,
      reviewers: input.responsiblePeople.reviewers,
    },
  };
}
