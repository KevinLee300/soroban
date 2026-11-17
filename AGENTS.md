# 小小珠算 — 開發指南（Claude Code 與 Codex 共用）

給家裡小朋友用的珠算學習網頁。部署在 GitHub Pages，用 LINE 分享連結。

## 原則
- **純網頁、沒有建置步驟、沒有套件**：HTML + CSS + 原生 JavaScript（ES modules）。不要加 React、打包工具或 npm 依賴。
- **介面文字一律繁體中文**，用小朋友聽得懂的話，句子短。
- **口訣統一用「+1 加五減四」的說法**（加五減四／減五加四、加十減X…），**不要用**傳統的「一下五去四」。
- 沒有後端、沒有帳號。進度只存在瀏覽器 localStorage（`js/storage.js`）。
- 按鈕要大、手機和平板都要好按。支援深色模式和 `prefers-reduced-motion`。

## 檔案
| 檔案 | 負責什麼 |
|---|---|
| `index.html` | 頁面結構（首頁關卡地圖、關卡頁：看動畫／練習） |
| `css/style.css` | 所有樣式，顏色都用 `:root` 的變數 |
| `js/logic.js` | **純邏輯**：口訣、動畫步驟產生器、出題、星星計算。不可碰 DOM。 |
| `js/abacus.js` | 算盤 SVG 元件，支援多檔（`rods`），檔位 0 = 個位 |
| `js/levels.js` | 關卡清單與設定 |
| `js/app.js` | 畫面控制：路由（`#home`、`#level-N`）、動畫播放、練習流程 |
| `js/kids.js` | **幼兒數學出題（純邏輯）**：18 個小遊戲 × 3 個難度，題目格式 `{ say, scene, choices, answer }` |
| `js/sheet.js`、`js/sheetapp.js` | 數學練習單（`#sheet`）：一頁 6 個區塊填格子、一次交卷。`sheet.js` 是純邏輯出題，`sheetapp.js` 是畫面 |
| `js/clocklesson.js`、`js/clockapp.js` | 時鐘小學堂（`#clock`）：引導式教學，只教長針、短針、整點、半點。`clocklesson.js` 是課程內容和純邏輯，`clockapp.js` 是卡通時鐘和畫面 |
| `js/kidsapp.js` | 幼兒數學的畫面：遊戲地圖（`#math`）、遊戲頁（`#math-<id>`）、星星 |
| `js/drill.js`、`js/coins.js` | 算盤題庫頁（`#drill`）、動畫旁的零錢盒 |
| `js/daily.js`、`js/records.js` | 每日任務與學習紀錄：`daily.js` 是純邏輯（挑任務、連續天數、統計），`records.js` 是畫面（首頁任務卡、`#parent` 紀錄頁） |
| `sw.js`、`manifest.webmanifest`、`js/pwa.js`、`icons/` | 自動更新、離線可用、加到主畫面。`sw.js` 是「先問網路，問不到才用存檔」，**不用維護檔案清單、更新時也不用改版本號** |
| `js/speech.js`、`js/voiceui.js` | 國語朗讀（用裝置內建語音，自動挑最自然的台灣女聲）；`voiceui.js` 是紀錄頁的聲音設定 |
| `js/storage.js` | 進度儲存 |
| `tests/` | `node --test` 測試 `logic.js` |
| `docs/TASKS.md` | 工作清單與分工 |

## 資料格式
- 動畫步驟：`{ v: 算盤數字, hl: [發亮的珠子], show: 顯示幾個算式片段, on: [標亮的片段], cap: 說明文字 }`
- 珠子代號：`r{檔位}-h`（上珠）、`r{檔位}-e{i}`（下珠，i=0 最靠近橫樑）
- 練習題：`{ start, target, text, hint }`

## 新增一關的步驟
1. 在 `js/logic.js` 寫步驟產生器（`buildXxxSteps`）和出題函式（`qN`）。
2. 在 `tests/logic.test.js` 加測試：最後一步等於答案、出的題都合理。
3. 在 `js/levels.js` 把那一關的 `ready` 改成 `true`，填 `demos` 或 `rules/demosFor` 和 `question`；需要多檔就加 `rods`。

## 開發與檢查
```bash
npm test              # 跑邏輯測試（不需要安裝任何東西）
npm run dev           # 開 http://localhost:8000 預覽（ES modules 不能直接雙擊 index.html 開）
```
送出前：`npm test` 要全過，並在手機寬度（約 400px）看過畫面。

## 協作規則（兩個 AI 一起開發）
- 每個工作開自己的分支：Claude 用 `claude/<主題>`，Codex 用 `codex/<主題>`。完成後開 PR 合併到 `main`，不要直接推 `main`。
- 開工前到 `docs/TASKS.md` 把工作標成「進行中」並寫上負責人，避免兩邊改同一個檔案。
- 盡量一個工作只動自己範圍的檔案；要改共用檔（`app.js`、`style.css`、`index.html`）時，改動越小越好，並在 PR 說明。
- 不要為了別的工作順手重構別人的程式。

## Codex 接手紀錄
- Codex 每次修改都同步更新 `docs/CODEX_HANDOFF.md`：需求、修改檔案與原因、驗證結果、已知限制／待辦、分支或 PR。
- Claude 接回時先讀交接文件及 `docs/TASKS.md`，確認 PR 是否已合併；保留歷史紀錄，以新增日期條目的方式更新。
- 不要把金鑰、個資或瀏覽器裡的實際學習資料寫進交接文件。
