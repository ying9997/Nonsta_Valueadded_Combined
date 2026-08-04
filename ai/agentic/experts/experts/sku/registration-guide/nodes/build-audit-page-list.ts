/**
 * 节点：组装单条 winit.item.page.list action（审核/事实切片）
 */
import {
  PAGE_LIST_ACTION,
  buildPageListAction,
  normalizeFetchProfile,
} from "../../../../shared/sku-item-page-list";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

async function main({ params }: { params: Record<string, unknown> }) {
  const skipApi = params.skipApi === true || params.shouldFetch === false;
  const skuCode = str(params.skuCode);
  const importCountryCode = str(params.importCountryCode);
  const fetchProfile = params.fetchProfile
    ? normalizeFetchProfile(params.fetchProfile)
    : "audit_status";

  if (skipApi || !skuCode) {
    return {
      actions: [],
      actionPlans: [],
      winitPluginBatchActionsCount: 0,
      actionName: PAGE_LIST_ACTION,
      fetchProfile,
      skipApi: true,
    };
  }

  const action = buildPageListAction({
    skuCodes: [skuCode],
    importCountryCode: importCountryCode || undefined,
    fetchProfile,
  });
  // `REGISTERING` is only an optional narrowing filter and hides already-published rows.
  // Registration status guidance must distinguish auditing, returned and published states.
  const actionData = JSON.parse(action.data) as Record<string, unknown>;
  delete actionData.queryType;
  action.data = JSON.stringify(actionData);

  return {
    actions: [action],
    actionPlans: [{ inputToken: skuCode, skuCode }],
    winitPluginBatchActionsCount: 1,
    actionName: PAGE_LIST_ACTION,
    fetchProfile,
    skipApi: false,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("build-audit-page-list")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
