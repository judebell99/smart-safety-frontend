// app/page.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import Worker3D from '../components/Worker3D'

export default function Dashboard() {
  return (
    <main className="w-full h-screen bg-slate-900 flex flex-col relative overflow-hidden">
      {/* UI Overlay */}
      <header className="absolute top-0 left-0 p-6 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold text-white tracking-tight">Smart Safety Control</h1>
        <p className="text-slate-400 mt-1">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
          Live UWB / LoRa Sync
        </p>
      </header>

      {/* 3D Scene */}
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        {/* 조명 및 환경 세팅 */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="city" />
        
        {/* 바닥 그리드 및 카메라 컨트롤 */}
        <Grid infiniteGrid fadeDistance={30} sectionColor="#444" cellColor="#222" />
        <OrbitControls makeDefault />

        {/* 우리가 만든 실시간 작업자 객체 렌더링 */}
        <Worker3D workerId="TAG-001" />
        <Worker3D workerId="TAG-002" />
        <Worker3D workerId="TAG-003" />
        <Worker3D workerId="TAG-004" />
        <Worker3D workerId="TAG-005" />
        <Worker3D workerId="TAG-006" />
      </Canvas>
    </main>
  )
}