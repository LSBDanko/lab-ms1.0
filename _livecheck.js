const { spawn } = require('child_process');
const path = require('path');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile = path.join(__dirname, '_edge_profile_livecheck');
const port = 9351;
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,900', 'https://lsbdanko.github.io/lab-ms1.0/frontend/index.html'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (c, l, x) => { if (c) { pass++; console.log('PASS ', l); } else { fail++; console.error('FAIL ', l, x ?? ''); } };
class CDP {
  constructor(ws) { this.ws = ws; this.id = 1; this.pending = new Map(); this.errors = []; ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') this.errors.push(m); }); }
  send(method, params = {}) { const id = this.id++; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  async eval(expression) { const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; }
}
async function waitFor(fn, ms = 20000) { const s = Date.now(); let l; while (Date.now() - s < ms) { try { l = await fn(); if (l) return l; } catch (e) { l = e; } await sleep(200); } throw new Error('timeout ' + (l?.message || '')); }
async function main() {
  let targets;
  await waitFor(async () => { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); return targets.some(t => t.type === 'page'); } catch { return false; } });
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
  const cdp = new CDP(ws);
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  await sleep(3000);
  await waitFor(async () => await cdp.eval(`!!document.getElementById('loginForm') && !!document.getElementById('apiConfigNotice')`), 30000);
  let initial = await cdp.eval(`({
    path: location.pathname,
    api: typeof API_BASE === 'string' ? API_BASE : '',
    noticeHidden: document.getElementById('apiConfigNotice').classList.contains('is-hidden'),
    login: !!document.getElementById('loginPage')
  })`);
  check(initial.path.endsWith('/frontend/index.html'), 'GitHub Pages 根入口跳转正常', initial);
  check(initial.api.includes('trycloudflare.com') && initial.noticeHidden, 'GitHub Pages 使用隧道 API 且提示已隐藏', initial);
  await cdp.eval(`document.getElementById('loginUsername').value='admin'; document.getElementById('loginPassword').value='123456'; document.getElementById('loginForm').requestSubmit();`);
  await waitFor(async () => await cdp.eval(`!document.getElementById('app').classList.contains('is-hidden') && DB.reagents.length === 6`), 30000);
  let logged = await cdp.eval(`({ user: state.user?.username, reagents: DB.reagents.length, notifications: currentNotifications.length, live: document.getElementById('liveState').textContent.trim() })`);
  check(logged.user === 'admin' && logged.reagents === 6 && logged.notifications > 0, 'GitHub Pages 线上登录与数据加载正常', logged);
  check(logged.live.includes('实时'), 'GitHub Pages 线上 SSE 连接正常', logged.live);
  check(cdp.errors.length === 0, '线上页面无 JS 异常', cdp.errors.length);
  console.log(`\nRESULT ${pass}/${pass + fail}`);
  ws.close(); browser.kill();
  if (fail) process.exit(1);
}
main().catch(e => { console.error(e); try { browser.kill(); } catch {} process.exit(1); });
