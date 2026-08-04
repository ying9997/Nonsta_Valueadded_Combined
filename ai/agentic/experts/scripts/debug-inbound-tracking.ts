import "dotenv/config";
import {
  ORDER_TRACKING_ACTION,
  getCozeWinitEnv,
  runCozeWinitWorkflow,
} from "../shared/inbound-winit-tracking";

async function tryNo(orderNo: string): Promise<void> {
  const env = getCozeWinitEnv();
  if (!env) {
    console.error("missing Coze env");
    process.exit(1);
  }
  try {
    const r = await runCozeWinitWorkflow(env, ORDER_TRACKING_ACTION, { orderNo });
    console.log(`--- orderNo=${orderNo} ---`);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.log(`--- orderNo=${orderNo} ERR ---`);
    console.error(e instanceof Error ? e.message : e);
  }
}

async function main(): Promise<void> {
  await tryNo("WI49616707");
  await tryNo("49616707");
}

main();
