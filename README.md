# 小小珠算

給家裡小朋友用的珠算學習網頁：看動畫學口訣，再自己撥算盤練習。

目前有：
- **珠算**：認識算盤、直接加減、五的好朋友、十的好朋友，附錢幣對照動畫和算盤題庫。
- **幼兒數學**：數甜甜圈、比大小、加減、平分、形狀、長短、規律、錢幣、看時鐘、動動腦，共 18 個小遊戲。

## 上線給家人用（GitHub Pages）
1. 這個 repo 設成 **Public**（免費帳號的 GitHub Pages 只能用在公開 repo；程式裡沒有任何個資或密碼）。
2. GitHub repo → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，按 Save。
3. 等 1–2 分鐘，網址會是 `https://<你的帳號>.github.io/<repo 名稱>/`。
4. 把網址貼到 LINE 家庭群組就好。

## 加到手機主畫面（像 App 一樣打開）
- **Android（Chrome）**：打開網站，拉到最下面按「安裝到主畫面」，或按右上角選單 →「加到主畫面」。
- **iPhone／iPad**：一定要用 **Safari** 打開（LINE 裡點開的話，先按右下角「用 Safari 開啟」），按「分享」→「加入主畫面」。
- 加好之後沒有網路也能練習；有網路時每次打開都會自動拿到最新版，不用按 Ctrl+F5。

## 本機預覽
```bash
npm run dev
```
打開 http://localhost:8000

## 測試
```bash
npm test
```

開發規則和分工請看 [AGENTS.md](AGENTS.md) 和 [docs/TASKS.md](docs/TASKS.md)。
