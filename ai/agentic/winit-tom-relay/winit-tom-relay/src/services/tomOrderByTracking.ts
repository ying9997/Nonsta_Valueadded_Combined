import {
  CookieJar,
  HttpSession,
  iamGetToken,
  iamLogin,
  overseasObOrderAjaxProcess,
} from "winit-tom-adapter";

/**
 * 单次请求内完成 IAM 登录、getToken、再按轨迹号查询海外 OB 订单（与 `tom:order` 一致，但轨迹来自参数）。
 */
export async function tomOrderByTracking(trackingNos: readonly string[]): Promise<unknown> {
  const jar = new CookieJar();
  const session = new HttpSession({ jar });
  await iamLogin(session, jar);
  await iamGetToken(session, jar);
  const base = process.env.WINIT_CNOMSTOM_BASE ?? "https://cnomstom.winit.com.cn";
  const page = process.env.WINIT_ORDERS_PAGE ?? "/OverseasOBOrder/index";
  const ref = process.env.WINIT_ORDERS_REFERER;
  return overseasObOrderAjaxProcess({
    session,
    baseUrl: base,
    pagePath: page,
    referer: ref,
    trackingNos,
  });
}
