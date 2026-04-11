// app/page.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { Grid, Environment } from '@react-three/drei'
import Worker3D from '../components/Worker3D'
import HeatmapFloor from '@/components/HeatmapFloor'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import CameraController from '@/components/CameraController'
import ChatBot from '@/components/ChatBot'

const TARGET_WORKERS = ['TAG-001', 'TAG-002', 'TAG-003', 'TAG-004', 'TAG-005', 'TAG-006']

export default function Dashboard() {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [workerPositions, setWorkerPositions] = useState<Record<string, [number, number, number]>>({})

  // 실시간으로 모든 작업자의 위치를 통합 관리 (카메라 추적용)
  useEffect(() => {
    const channel = supabase.channel('global_pos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worker_status' }, (payload) => {
        const { worker_id, pos_x, pos_z, pos_y } = payload.new
        setWorkerPositions(prev => ({ ...prev, [worker_id]: [pos_x, pos_z, pos_y] }))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

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

      <div className="absolute top-28 left-6 z-20 flex flex-col gap-2">
        <button
          onClick={() => setSelectedTarget(null)}
          className={`px-4 py-2 rounded ${!selectedTarget ? 'bg-blue-600' : 'bg-slate-700'} text-white text-sm`}
        >
          전체 보기 (Global)
        </button>
        {Object.keys(workerPositions).map(id => (
          <button
            key={id}
            onClick={() => setSelectedTarget(id)}
            className={`px-4 py-2 rounded ${selectedTarget === id ? 'bg-red-600' : 'bg-slate-700'} text-white text-sm transition-colors`}
          >
            {id} 추적하기
          </button>
        ))}
      </div>

      {/* 🗺️ 미니맵 HUD (우측 상단 오버레이) */}
      <div className="absolute top-6 right-6 w-48 h-48 border-2 border-slate-700 rounded-lg bg-slate-800/80 overflow-hidden z-20 shadow-2xl">
        <div className="absolute top-1 left-2 text-[10px] text-slate-400 font-bold uppercase">Minimap</div>
        <div className="relative w-full h-full p-2">
          {/* 미니맵 점 시각화 (2D 방식) */}
          {Object.entries(workerPositions).map(([id, pos]) => (
            <div
              key={id}
              className={`absolute w-2 h-2 rounded-full transition-all duration-300 ${id === selectedTarget ? 'bg-yellow-400 scale-150' : 'bg-blue-400'}`}
              style={{
                left: `${50 + (pos[0] * 3)}%`,
                top: `${50 + (pos[2] * 3)}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [10, 10, 10], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.4} />
        <Environment preset="city" />
        <Grid infiniteGrid sectionColor="#334155" cellColor="#1e293b" />
        <HeatmapFloor />

        <CameraController targetId={selectedTarget} workerPositions={workerPositions} />

        {TARGET_WORKERS.map(id => (
          <Worker3D key={id} workerId={id} />
        ))}
      </Canvas>

      <ChatBot />
    </main>
  )
}