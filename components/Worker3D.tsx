'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Mesh } from 'three'
import { Line, Text, Trail } from '@react-three/drei'

interface Worker3DProps {
  workerId: string;
}

export default function Worker3D({ workerId }: Worker3DProps) {
  const meshRef = useRef<Mesh>(null)
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const [isDanger, setIsDanger] = useState(false)
  const [hasHelmet, setHasHelmet] = useState(false)
  const [pathHistory, setPathHistory] = useState<[number, number, number][]>([])

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('worker_status')
        .select('*')
        .eq('worker_id', workerId)
        .single()

      if (data && !error) {
        const initPos: [number, number, number] = [data.pos_x, 0.05, data.pos_y]
        setPosition([data.pos_x, data.pos_z, data.pos_y])
        setIsDanger(data.is_danger)
        setHasHelmet(data.has_helmet)
        setPathHistory([initPos])
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

  return (<>
    {/* 🌟 수정: 실선(Solid Line)으로 변경하고 투명도 조정 */}
    {pathHistory.length > 1 && (
      <Line
        points={pathHistory}
        color={statusColor}
        lineWidth={3}         // 조금 더 두껍게
        dashed={false}        // 끊김 현상의 주범인 dashed를 false로 변경
        transparent
        opacity={0.6}         // 존재감이 확실하도록 투명도 상향
      />
    )}

    <group position={position}>
      <Trail width={0.6} length={10} color={statusColor} local={false}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.5} />
        </mesh>
      </Trail>
      <Text position={[0, 1.2, 0]} fontSize={0.25} color="white" outlineWidth={0.02} outlineColor="#000">
        {workerId}
      </Text>
    </group>
  </>
  )
}