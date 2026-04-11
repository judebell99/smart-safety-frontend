'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Mesh } from 'three'
import { Text } from '@react-three/drei'

interface Worker3DProps {
  workerId: string;
}

export default function Worker3D({ workerId }: Worker3DProps) {
  const meshRef = useRef<Mesh>(null)
  
  // 3D 좌표 [x, y, z] 배열 상태
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0])
  const [isDanger, setIsDanger] = useState(false)
  const [hasHelmet, setHasHelmet] = useState(false)

  useEffect(() => {
    // 1. 페이지 로드 시 최신 데이터 1회 Fetch
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('worker_status')
        .select('*')
        .eq('worker_id', workerId)
        .single()
      
      if (data && !error) {
        // UWB의 (X, Y, Z)를 Three.js 공간에 매핑 (Y축이 높이이므로 위치 조정)
        setPosition([data.pos_x, data.pos_z, data.pos_y]) 
        setIsDanger(data.is_danger)
      }
    }
    
    fetchInitialData()

    // 2. Supabase Realtime 채널 구독 (핵심 로직)
    const channel = supabase.channel(`realtime:worker_${workerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'worker_status',
          filter: `worker_id=eq.${workerId}`
        },
        (payload) => {
            const newData = payload.new
            setPosition([newData.pos_x, newData.pos_z, newData.pos_y])
            // 상태 업데이트 (has_helmet 추가)
            setIsDanger(newData.is_danger)
            setHasHelmet(newData.has_helmet) // useState 추가 필요
        }
      )
      .subscribe()

    // 컴포넌트 언마운트 시 메모리 누수 방지
    return () => {
      supabase.removeChannel(channel)
    }
  }, [workerId])

  const isAlert = isDanger || !hasHelmet;

  return (
    // position 상태값이 변할 때마다 Three.js가 자동으로 객체를 이동시킵니다.
    <mesh position={position}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={isAlert ? '#ef4444' : '#22c55e'} />
        <Text position={[0, 1.2, 0]} fontSize={0.2} color="white">
        {`${workerId} ${!hasHelmet ? '(안전모 미착용)' : ''}`}
        </Text>
    </mesh>
  )
}