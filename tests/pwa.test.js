import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/pwa.js", import.meta.url), "utf8");
function setup({ ua = "Chrome", standalone = false, hash = "", prompt = null } = {}) {
  const elements = new Map(), handlers = {};
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, open: false, disabled: false, textContent: "", children: [],
      showModal() { this.open = true; }, close() { this.open = false; },
      replaceChildren(...nodes) { this.children = nodes; },
      focus() {}, select() { this.selected = true; },
    });
    return elements.get(id);
  };
  const location = { href: "https://example.com/soroban/" + hash, hash, protocol: "https:", hostname: "example.com" };
  const context = {
    document: { getElementById: el, createElement: () => ({ textContent: "" }) },
    window: { addEventListener: (name, cb) => { handlers[name] = cb; } },
    navigator: { userAgent: ua, platform: "", maxTouchPoints: 0, onLine: true, clipboard: { writeText: async () => {} } },
    location, URL, matchMedia: () => ({ matches: standalone, addEventListener() {} }),
  };
  vm.runInNewContext(source, context);
  if (prompt) handlers.beforeinstallprompt({ preventDefault() {}, prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  return { el, handlers, context };
}

test("安裝：有提示時由點按觸發一次，取消後還能看說明", async () => {
  let calls = 0;
  const { el } = setup({ prompt: async () => { calls++; } });
  assert.equal(calls, 0);
  assert.equal(el("installBtn").textContent, "安裝到主畫面");
  await el("installBtn").onclick();
  assert.equal(calls, 1);
  assert.equal(el("installBtn").disabled, false);
  await el("installBtn").onclick();
  assert.equal(calls, 1);
  assert.equal(el("installDialog").open, true);
});

test("安裝：提示失敗會顯示說明並恢復按鈕", async () => {
  const { el } = setup({ prompt: async () => { throw Error("unavailable"); } });
  await el("installBtn").onclick();
  assert.equal(el("installDialog").open, true);
  assert.equal(el("installBtn").disabled, false);
});

test("安裝：iOS、LINE、分享連結與已安裝狀態", async () => {
  const ios = setup({ ua: "iPhone Safari", hash: "#install" });
  assert.equal(ios.el("installDialog").open, true);
  assert.match(ios.el("installTip").textContent, /Safari/);
  assert.ok(ios.el("installSteps").children.some((li) => li.textContent.includes("分享")));
  assert.equal(ios.el("installUrl").value, "https://example.com/soroban/#install");
  const line = setup({ ua: "iPhone Line/16" });
  await line.el("installBtn").onclick();
  assert.match(line.el("installTip").textContent, /App 內/);
  const app = setup({ standalone: true });
  assert.equal(app.el("installCard").hidden, true);
  const installed = setup();
  installed.handlers.appinstalled();
  assert.equal(installed.el("installCard").hidden, true);
});

test("安裝：複製連結失敗時選取網址；離線提醒仍有效", async () => {
  const { el, context, handlers } = setup();
  context.navigator.clipboard.writeText = async () => { throw Error("denied"); };
  await el("installCopy").onclick();
  assert.equal(el("installUrl").selected, true);
  assert.match(el("installStatus").textContent, /Ctrl\+C/);
  context.navigator.onLine = false;
  handlers.offline();
  assert.equal(el("offlineNote").hidden, false);
});
