# 小小珠算

給家裡小朋友用的珠算學習網頁：看動畫學口訣，再自己撥算盤練習。

目前有：第 1 關 認識算盤、第 2 關 直接加減、第 3 關 五的好朋友。

## 上線給家人用（GitHub Pages）
1. 這個 repo 設成 **Public**（免費帳號的 GitHub Pages 只能用在公開 repo；程式裡沒有任何個資或密碼）。
2. GitHub repo → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`，按 Save。
3. 等 1–2 分鐘，網址會是 `https://<你的帳號>.github.io/<repo 名稱>/`。
4. 把網址貼到 LINE 家庭群組就好。手機打開後可以「加入主畫面」，用起來像 App。

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
