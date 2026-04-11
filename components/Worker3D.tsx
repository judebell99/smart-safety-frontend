'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Mesh } from 'three'
import { Html, Line, Text, Trail } from '@react-three/drei'

interface Worker3DProps {
  workerId: string;
}

export default function Worker3D({ workerId }: Worker3DProps) {
  const meshRef = useRef<Mesh>(null)
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const [isDanger, setIsDanger] = useState(false)
  const [hasHelmet, setHasHelmet] = useState(false)
  const [pathHistory, setPathHistory] = useState<[number, number, number][]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from('worker_status').select('*').eq('worker_id', workerId).single()
      if (data && !error) {
        setPosition([data.pos_x, data.pos_z, data.pos_y])
        setIsDanger(data.is_danger)
        setHasHelmet(data.has_helmet)
        setPathHistory([[data.pos_x, 0.05, data.pos_y]])
      }
    }
    fetchInitialData()

    const channel = supabase.channel(`realtime:worker_${workerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'worker_status', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          const newData = payload.new
          // 실제 객체 위치 (Z축 반영)
          setPosition([newData.pos_x, newData.pos_z, newData.pos_y])
          setIsDanger(newData.is_danger)
          setHasHelmet(newData.has_helmet)

          // 🌟 동선용 위치: 바닥에서 살짝 띄운 좌표 사용
          const historyPos: [number, number, number] = [newData.pos_x, 0.05, newData.pos_y]

          setPathHistory((prev) => {
            // 이전 좌표와 너무 가까우면 추가하지 않음 (데이터 노이즈 제거)
            const last = prev[prev.length - 1]
            if (last && Math.abs(last[0] - historyPos[0]) < 0.01 && Math.abs(last[2] - historyPos[2]) < 0.01) {
              return prev
            }
            return [...prev, historyPos].slice(-100)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workerId])

  const isAlert = isDanger || !hasHelmet;
  const statusColor = isAlert ? '#ef4444' : '#3b82f6'; // 정상일 때 파란색(Blue)으로 변경하여 사이버틱한 느낌 강조

  const mockHeartRate = 75 + Math.floor(Math.random() * 10);

  return (
    <>
      {pathHistory.length > 1 && (
        <Line points={pathHistory} color={statusColor} lineWidth={3} transparent opacity={0.6} />
      )}

      <group position={position}>
        <Trail width={0.6} length={10} color={statusColor} local={false}>
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} />
          </mesh>
        </Trail>

        {/* 🌟 기존 Text 대신 Html 컴포넌트 삽입 */}
        <Html
          position={[0, 1.5, 0]} // 구체 위쪽에 위치
          center                 // 중앙 정렬
          zIndexRange={[100, 0]} // 3D 객체에 가려지지 않도록 z-index 설정
        >
          {/* Glassmorphism Tailwind UI */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              cursor-pointer select-none overflow-hidden transition-all duration-300 ease-out
              backdrop-blur-md border border-white/20 shadow-2xl rounded-xl
              ${isAlert ? 'bg-red-500/20' : 'bg-slate-800/40'}
              ${isExpanded ? 'w-48 p-4' : 'w-24 p-2'}
            `}
          >
            {/* 상단 헤더 (항상 보임) */}
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">{workerId}</span>
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAlert ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`}></span>
              </span>
            </div>

            {/* 확장 영역 (클릭 시 보임) */}
            <div className={`mt-3 space-y-2 transition-opacity duration-300 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
              <div className="flex justify-between text-xs text-slate-200 border-b border-white/10 pb-1">
                <span>상태</span>
                <span className={isDanger ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {isDanger ? '위험구역' : '안전'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-200 border-b border-white/10 pb-1">
                <span>안전모</span>
                <span className={!hasHelmet ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {!hasHelmet ? '미착용' : '착용됨'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-200">
                <span>BPM (심박)</span>
                <span className="text-blue-300 font-mono">{mockHeartRate}</span>
              </div>
            </div>
          </div>
        </Html>
      </group>
    </>
  )
}