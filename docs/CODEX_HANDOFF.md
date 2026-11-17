# Codex → Claude 交接紀錄

此檔記錄 Codex 接手期間的需求、變更與驗證。後續修改請依日期追加；先確認分支與 PR 是否已合併，再繼續工作。

## 2026-11-17｜練習單系列題型、圖案與主畫面安裝

### 使用者需求
1. 練習單保留現有六種混合題，新增同一題型連續練習，幫助小朋友熟悉題型。
2. 改善題目圖案。
3. 加入主畫面改成容易點按的按鈕／可分享連結。
4. Codex 修改資訊必須記錄，方便之後由 Claude 接回。

### 基準與分支
- Repo：KevinLee300/soroban；基準 main：`96bf0a58c3e8d7edfbb03abffe76ae756da1e5c6`。
- 分支：`codex/worksheet-series-install`。
- PR：[#12 練習單系列與主畫面安裝](https://github.com/KevinLee300/soroban/pull/12)，建立時尚未合併。接回前請確認 PR 最新狀態。
- 開工登記提交：`2d992394e804f041e0e09aaaa492afaedc8498b0`。
- 透過 GitHub 連線修改分支，未 clone；測試使用同一份原始碼的暫存快照，不需要安裝依賴。
- 本次交接以 PR 為單位，合併後才會進入 main／GitHub Pages。

### 完成內容與設計
- 預設仍為混合題：接著填、比大小、分一分、加一加、減一減、找數字各一區，共 13 格。
- 新增六種單一題型：整張六區都是選取的題型；比大小共 18 格，其餘各 12 格。沿用三種難度、換一張、重寫、批改與列印。
- 混合題星星仍用 `sheet.<難度>`，保留既有成績；單一題型用 `sheet.<題型>.<難度>`，學習紀錄標籤也包含題型。仍由原本 storage.js 依家人分開儲存，無資料搬移。
- 圖案：數字接龍改為彩色車廂搭配 SVG 小火車；甜甜圈加上分組盤，每排最多五個；同區兩題間加分隔；區塊有編號、可讀性較好的標題，比大小按鈕至少 44px。沿用主題變數與現有 donut SVG，沒有加入圖片依賴。
- 頁尾提供「加入主畫面」按鈕：有 `beforeinstallprompt` 才叫出瀏覽器確認；未支援時顯示原生 dialog 步驟，區分 iOS、LINE／App 內瀏覽器、Chrome／Edge。
- 網址 `#install` 開啟安裝說明，可複製分享。開網址不會自動安裝；需要使用者點按與作業系統確認。已從主畫面開啟時隱藏安裝卡。
- 原本 service worker 註冊、離線提醒與更新策略維持不變，不需要變更 sw.js 版本號。

### 修改檔案
| 檔案 | 修改原因 |
| --- | --- |
| js/sheet.js | SHEET_TYPES、makeSheetSections 產生六區；sheetBlanks 接受區塊陣列並依畫面順序給答案；保留 makeSheet 既有介面 |
| js/sheetapp.js | 題型選擇、逐區渲染、獨立星星與紀錄、列印標題、圖案與操作標籤 |
| index.html | 題型操作區、更新練習單入口文字、安裝卡與原生說明 dialog |
| css/style.css | 練習單圖案、觸控尺寸、安裝介面、手機與列印適配 |
| js/pwa.js | 使用者點按安裝／說明、分享連結、取消或失敗後恢復操作、已安裝狀態 |
| tests/sheet.test.js | 混合題相容性、六種題型與三種難度、答案順序／格數、無效題型 |
| tests/pwa.test.js | 安裝提示只由點按觸發、取消／失敗、iOS／LINE、分享連結、已安裝、複製失敗與離線提醒 |
| README.md | 使用方式與安裝限制 |
| AGENTS.md、CLAUDE.md | 後續維持交接紀錄，Claude 自動載入本文件 |
| docs/TASKS.md、docs/CODEX_HANDOFF.md | 工作狀態與本次交接 |

### 驗證
- `node --test tests/*.test.js`：43 項全過（原有 37 項，加 6 項）。
- 真實瀏覽器預覽：400px 手機與 820px 平板寬度無整頁橫向溢出，六區正常渲染；手機單欄、平板雙欄。
- 實際切換七種模式，混合題 13 格，六種系列各 12／18 格。
- 單一加法 12 格與混合題 13 格，從畫面算出答案填入後皆為 100 分；星星、重寫清空、空白交卷二次確認、錯格正解均正常。
- 安裝按鈕可開啟說明；複製連結顯示成功；直接開 `#install` 顯示說明，底下首頁正常載入。
- 既有一般模式成績保留。生產網站資料未操作。
- 原生安裝提示的成功／取消／失敗由測試替身驗證，未在使用者電腦上實際安裝 App。

### 限制與交接注意
- 尚未實測 iPhone／Android 真機安裝與實體印表機／A4 列印。請在合併後用 HTTPS 網站與手機確認。
- 安裝能力取決於瀏覽器，沒有網址能繞過使用者確認直接在主畫面新增圖示。iOS 依 Safari 分享流程操作。
- 六區單一題型獨立隨機產生，跨區可能遇到重複題；每區原有的兩題不重複規則保留。
- 未新增套件、後端、帳號或更動既有學習資料格式；沒有改其他待辦功能。
- 若繼續擴充題型，注意渲染與 sheetBlanks 的順序必須一致，並檢查星星 key 的相容性。
- 安裝 API 參考：[MDN beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)；[Apple 加到主畫面說明](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios)。
