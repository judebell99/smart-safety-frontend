'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Group, Mesh, Vector3 } from 'three'
import { Html, Line, Text, Trail } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

interface Worker3DProps {
  workerId: string;
}

export default function Worker3D({ workerId }: Worker3DProps) {
  const groupRef = useRef<Group>(null)
  const targetPos = useRef(new Vector3(0, 0, 0))

  const [isDanger, setIsDanger] = useState(false)
  const [hasHelmet, setHasHelmet] = useState(true)
  const [pathHistory, setPathHistory] = useState<[number, number, number][]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from('worker_status').select('*').eq('worker_id', workerId).single()
      if (data && !error) {
        // State 대신 Ref에 목표 좌표 저장
        targetPos.current.set(data.pos_x, 0, data.pos_y)
        setIsDanger(data.is_danger)
        setHasHelmet(data.has_helmet)
        setPathHistory([[data.pos_x, 0.05, data.pos_y]])

        // 초기 렌더링 시에는 순간이동으로 위치 맞춤
        if (groupRef.current) {
          groupRef.current.position.copy(targetPos.current)
        }
      }
    }
    fetchInitialData()

    const channel = supabase.channel(`realtime:worker_${workerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worker_status', filter: `worker_id=eq.${workerId}` }, (payload) => {
        const newData = payload.new

        // 🌟 데이터가 들어오면 객체를 바로 옮기는 게 아니라 "목표 지점(Target)"만 업데이트
        targetPos.current.set(newData.pos_x, 0, newData.pos_y)

        setIsDanger(newData.is_danger)
        setHasHelmet(newData.has_helmet)
        setPathHistory(prev => {
          const last = prev[prev.length - 1]
          if (last && Math.abs(last[0] - newData.pos_x) < 0.01 && Math.abs(last[2] - newData.pos_y) < 0.01) return prev
          return [...prev, [newData.pos_x, 0.05, newData.pos_y]].slice(-100) as [number, number, number][]
        })
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workerId])

  useFrame((state, delta) => {
    if (groupRef.current) {
      // 현재 위치에서 목표 위치(targetPos)로 부드럽게 미끄러지듯 보간(Lerp)
      // 0.1은 이동 속도(쫀득함)를 결정합니다. 낮을수록 미끄러짐이 강해집니다.
      groupRef.current.position.lerp(targetPos.current, 0.01)
    }
  })

  const isAlert = isDanger || !hasHelmet;
  const statusColor = isAlert ? '#ef4444' : '#3b82f6';
  const mockHeartRate = 75 + Math.floor(Math.random() * 10);

  return (
    <>
      {pathHistory.length > 1 && (
        <Line points={pathHistory} color={statusColor} lineWidth={3} transparent opacity={0.6} />
      )}

      {/* 🌟 position을 state로 바인딩하지 않고, useFrame이 제어하도록 빈 group에 Ref 연결 */}
      <group ref={groupRef}>

        {/* 👷‍♂️ 사람 형태(Humanoid) 아바타 조립 */}
        <group position={[0, 0, 0]}>
          {/* 머리 (Head) */}
          <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.4} />
          </mesh>

          {/* 몸통 (Body) */}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.3, 0.2, 1.0, 16]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.2} transparent opacity={0.8} />
          </mesh>

          {/* 안전모 (Helmet) - hasHelmet 상태에 따라 조건부 렌더링 */}
          {hasHelmet && (
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.2} /> {/* 노란색 안전모 */}
            </mesh>
          )}
        </group>

        {/* Floating HTML Card (위치 상향 조정) */}
        <Html position={[0, 2.2, 0]} center zIndexRange={[100, 0]}>
          <div onClick={() => setIsExpanded(!isExpanded)} className={`cursor-pointer select-none overflow-hidden transition-all duration-300 ease-out backdrop-blur-md border border-white/20 shadow-2xl rounded-xl ${isAlert ? 'bg-red-500/20' : 'bg-slate-800/40'} ${isExpanded ? 'w-48 p-4' : 'w-24 p-2'}`}>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">{workerId}</span>
              <span className="flex h-3 w-3 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAlert ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`}></span>
              </span>
            </div>
            <div className={`mt-3 space-y-2 transition-opacity duration-300 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
              <div className="flex justify-between text-xs text-slate-200 border-b border-white/10 pb-1">
                <span>상태</span><span className={isDanger ? 'text-red-400 font-bold' : 'text-green-400'}>{isDanger ? '위험' : '안전'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-200 border-b border-white/10 pb-1">
                <span>안전모</span><span className={!hasHelmet ? 'text-red-400 font-bold' : 'text-green-400'}>{!hasHelmet ? '미착용' : '착용됨'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-200">
                <span>BPM</span><span className="text-blue-300 font-mono">{mockHeartRate}</span>
              </div>
            </div>
          </div>
        </Html>

      </group>
    </>
  )
}