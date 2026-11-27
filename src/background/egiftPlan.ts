// SCRAPE_EGIFT with `runner: 'plan'`: runs the bundled costcoEgift step plan (src/lib/plans.default.json)
// instead of the built-in runner. The link and email come from the same GET /api/extension/egift. A
// plan that fails validation falls back to the built-in runner (and the report says so), except for a
// dry run, which never falls back because the built-in runner would really save cards.
import { BUNDLED_PLANS, BUNDLED_PLANS_ERROR } from '../lib/stepPlan';
import { runPlan, type PlanReport } from '../lib/planRun';
import { egiftReport, isAllowedEgiftLink, parseEgiftInfo } from '../lib/egiftCommand';
import { claimEgiftRun, releaseEgiftRun, runEgiftOrder } from './egiftRun';
import { chromeDriver } from './planDriver';

const PLAN_NAME = 'costcoEgift';

export async function runEgiftPlan(
  base: string, headers: Record<string, string>, orderId: number, opts: { dryRun?: boolean } = {}, doFetch: typeof fetch = fetch,
): Promise<PlanReport | (ReturnType<typeof egiftReport> & { result: { runner: string; planFallback?: string } })> {
  const bundled = BUNDLED_PLANS;
  const plan = bundled?.plans[PLAN_NAME];
  if (!bundled || !plan) {
    if (opts.dryRun) return { ...egiftReport(0, 0, 'plan-failed'), result: { ...egiftReport(0, 0, 'plan-failed').result, runner: 'plan-invalid' } };
    const r = await runEgiftOrder(base, headers, orderId, doFetch);
    return { status: r.status, result: { ...r.result, runner: 'builtin', planFallback: BUNDLED_PLANS_ERROR ? 'plan-invalid' : 'plan-missing' } };
  }
  if (!claimEgiftRun()) return { ...egiftReport(0, 0, 'run-busy'), result: { ...egiftReport(0, 0, 'run-busy').result, runner: `plan v${bundled.version}` } };
  try {
    const res = await doFetch(`${base}/api/extension/egift?orderId=${orderId}`, { headers, cache: 'no-store' });
    const fail = (c: Parameters<typeof egiftReport>[2]) => ({ status: 'failed' as const, result: { ...egiftReport(0, 0, c).result, runner: `plan v${bundled.version}`, trace: [] } });
    if (!res.ok) return fail(`info-http-${res.status}`);
    const info = parseEgiftInfo(await res.json().catch(() => null));
    if (!info) return fail('no-link');
    if (!isAllowedEgiftLink(info.link)) return fail('link-rejected');
    const driver = chromeDriver(base, headers, plan.hosts, doFetch);
    return await runPlan(PLAN_NAME, plan, bundled.version, driver, { link: info.link, email: info.email, orderId }, opts);
  } finally {
    releaseEgiftRun();
  }
}
