// app/page.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { Environment, Text } from '@react-three/drei'
import Worker3D from '../components/Worker3D'
import HeatmapFloor from '@/components/HeatmapFloor'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import CameraController from '@/components/CameraController'
import ChatBot from '@/components/ChatBot'
import FurnitureEditor from '@/components/FurnitureEditor'

const TARGET_WORKERS = ['TAG-001', 'TAG-002', 'TAG-003']

export default function Dashboard() {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [workerPositions, setWorkerPositions] = useState<Record<string, [number, number, number]>>({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [saveTrigger, setSaveTrigger] = useState(0)
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')

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

      {/* 가구/설비 배치 에디터 UI (DOM 오버레이 - Canvas 외부) */}
      <div className="absolute bottom-6 left-6 z-30 flex flex-col-reverse gap-2 items-start pointer-events-auto">
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.3)] text-sm font-bold transition-all border border-white/10 ${isEditMode ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
        >
          {isEditMode ? '✖ 배치 모드 종료' : '🛋️ 설비/가구 배치 모드'}
        </button>
        {isEditMode && (
          <button
            onClick={() => setSaveTrigger(prev => prev + 1)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg shadow-xl text-sm font-bold transition-all border border-white/10"
          >
            💾 현재 레이아웃 저장
          </button>
        )}
        {isEditMode && (
          <div className="flex gap-2">
            <button onClick={() => setTransformMode('translate')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-xl border border-white/10 ${transformMode === 'translate' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              ↔ 이동
            </button>
            <button onClick={() => setTransformMode('rotate')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-xl border border-white/10 ${transformMode === 'rotate' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              ↻ 회전
            </button>
            <button onClick={() => setTransformMode('scale')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-xl border border-white/10 ${transformMode === 'scale' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              ⤡ 크기
            </button>
          </div>
        )}
        {isEditMode && (
          <div className="bg-slate-800/90 text-xs text-slate-300 p-4 rounded-xl shadow-xl border border-slate-600 w-64 backdrop-blur-md">
            💡 <strong className="text-white">편집 모드 활성화됨</strong><br /><br />
            • 객체를 클릭 후 기즈모를 조작하세요.<br />
            • 빈 공간을 드래그해 화면을 돌려보세요.<br />
            • 저장 시 DB에 반영됩니다.
          </div>
        )}
      </div>

      <Canvas camera={{ position: [9, 8, 13], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.4} />
        <Environment preset="city" />

        {/* 외곽 기본 바닥 (그리드 대체용 연한 바닥) */}
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.2} />
        </mesh>

        <HeatmapFloor />

        {/* 작업 구역 (Work Zone: Z 1.01 ~ 9.46) */}
        <group>
          <mesh position={[1.54, 0.025, 5.235]}>
            <boxGeometry args={[8.86, 0.05, 8.45]} />
            <meshStandardMaterial color="#f59e0b" transparent opacity={0.15} />
          </mesh>
          <Text position={[1.54, 0.06, 5.235]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color="#fcd34d" fillOpacity={0.8}>
            WORK ZONE
          </Text>
        </group>

        {/* 안전 구역 (Safe Zone: Z 9.46 ~ 11.86) */}
        <group>
          <mesh position={[1.54, 0.025, 10.66]}>
            <boxGeometry args={[8.86, 0.05, 2.4]} />
            <meshStandardMaterial color="#4ade80" transparent opacity={0.15} />
          </mesh>
          <Text position={[1.54, 0.06, 10.66]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color="#86efac" fillOpacity={0.5}>
            SAFE ZONE
          </Text>
        </group>

        <CameraController
          targetId={selectedTarget}
          workerPositions={workerPositions}
          defaultTarget={[1.54, 0, 6.435]}
          minDistance={8}
          maxDistance={18}
          minPolarAngle={0.4}
          maxPolarAngle={Math.PI / 2.1}
        />

        {/* 가구/설비 배치 에디터 (3D 객체만 렌더링) */}
        <FurnitureEditor
          isEditMode={isEditMode}
          saveTrigger={saveTrigger}
          setIsEditMode={setIsEditMode}
          transformMode={transformMode}
        />

        {TARGET_WORKERS.map(id => (
          <Worker3D key={id} workerId={id} />
        ))}
      </Canvas>

      <ChatBot />
    </main>
  )
}