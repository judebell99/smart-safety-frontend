// app/page.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import Worker3D from '../components/Worker3D'
import HeatmapFloor from '@/components/HeatmapFloor'

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
      <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
        {/* 배경을 우주/심야 느낌의 어두운 색으로 설정 */}
        <color attach="background" args={['#0f172a']} />

        {/* 안개 효과를 주어 멀리 있는 그리드가 자연스럽게 사라지도록 연출 */}
        <fog attach="fog" args={['#0f172a', 10, 30]} />

        {/* 조명을 어둡게 세팅하여 객체의 자체 발광(Emissive)이 돋보이게 함 */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 10]} intensity={0.5} />

        {/* 사이버틱한 바닥 그리드 */}
        <Grid infiniteGrid fadeDistance={30} sectionColor="#334155" cellColor="#1e293b" />
        <HeatmapFloor />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />

        {/* 작업자들 (6명) */}
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