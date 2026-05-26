'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Group, Vector3 } from 'three'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

interface Worker3DProps {
  workerId: string;
}

export default function Worker3D({ workerId }: Worker3DProps) {
  const groupRef = useRef<Group>(null)
  const targetPos = useRef(new Vector3(0, 0, 0))

  const [isDanger, setIsDanger] = useState(false)
  const [hasHelmet, setHasHelmet] = useState(true)       // 압력 센서와 연동
  const [heartRate, setHeartRate] = useState(0) // 심박 센서 상태 추가
  const [pathHistory, setPathHistory] = useState<[number, number, number][]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from('worker_status').select('*').eq('worker_id', workerId).single()
      if (data && !error) {
        targetPos.current.set(data.pos_x, 0, data.pos_y)

        // 💡 수정된 부분: 압력은 안전모로, 심박은 심박 상태로 각각 매핑
        setHasHelmet(data.is_pressure_normal)
        setHeartRate(data.heart_rate)
        setIsDanger(data.is_danger)
        setPathHistory([[data.pos_x, 0.05, data.pos_y]])

        if (groupRef.current) {
          groupRef.current.position.copy(targetPos.current)
        }
      }
    }
    fetchInitialData()

    const channel = supabase.channel(`realtime:worker_${workerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worker_status', filter: `worker_id=eq.${workerId}` }, (payload) => {
        const newData = payload.new

        targetPos.current.set(newData.pos_x, 0, newData.pos_y)

        // 💡 수정된 부분: 실시간 데이터도 각각 매핑
        setHasHelmet(newData.is_pressure_normal)
        setHeartRate(newData.heart_rate)
        setIsDanger(newData.is_danger)

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
      groupRef.current.position.lerp(targetPos.current, 0.01)
    }
  })

  // 💡 수정된 부분: 심박수가 비정상(60 미만 또는 120 초과)이어도 경고(Alert) 발동
  const isAbnormalHeartRate = heartRate > 0 && (heartRate < 60 || heartRate > 120);
  const isAlert = isDanger || !hasHelmet || isAbnormalHeartRate;
  const statusColor = isAlert ? '#ef4444' : '#3b82f6';

  return (
    <>
      {pathHistory.length > 1 && (
        <Line points={pathHistory} color={statusColor} lineWidth={3} transparent opacity={0.6} />
      )}

      <group ref={groupRef}>
        <group position={[0, 0, 0]}>
          <mesh position={[0, 1.4, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.4} />
          </mesh>

          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.3, 0.2, 1.0, 16]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.2} transparent opacity={0.8} />
          </mesh>

          {hasHelmet && (
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
              <meshStandardMaterial color="#fbbf24" roughness={0.2} />
            </mesh>
          )}
        </group>

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
                {/* 💡 심박수 상태 UI 추가 */}
                <span>심박(BPM)</span>
                <span className={isAbnormalHeartRate ? 'text-red-400 font-bold' : 'text-blue-300 font-mono'}>
                  {isAbnormalHeartRate ? `이상 (${heartRate})` : (heartRate > 0 ? heartRate : '-')}
                </span>
              </div>
            </div>
          </div>
        </Html>
      </group>
    </>
  )
}