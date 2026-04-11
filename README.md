# 🛡️ Smart Safety Control - Frontend
> UWB/LoRa 기반 산업 현장 실시간 3D 관제 대시보드

Next.js와 React Three Fiber를 활용하여 작업자의 실시간 위치와 안전 상태를 3D 디지털 트윈으로 시각화합니다.

## 🛠 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **3D Engine:** React Three Fiber (R3F), Three.js, @react-three/drei
- **Realtime DB:** Supabase Realtime
- **Styling:** Tailwind CSS

## ⚙️ Environment Variables
`.env.local` 파일을 생성하고 다음 값을 설정하세요.
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Getting Started
```bash
npm install
npm run dev
```
