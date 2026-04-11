'use client'

import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'

interface CameraControllerProps {
  targetId: string | null;
  workerPositions: Record<string, [number, number, number]>;
}

export default function CameraController({ targetId, workerPositions }: CameraControllerProps) {
  const controlsRef = useRef<any>(null)
  const vec = new Vector3()
  const lookAtVec = new Vector3()

  useFrame((state) => {
    if (targetId && workerPositions[targetId]) {
      const [tx, ty, tz] = workerPositions[targetId]

      // 1. 목표 카메라 위치 (작업자 뒤쪽 상단)
      vec.set(tx + 5, ty + 5, tz + 5)
      // 2. 카메라 시점 (작업자 위치)
      lookAtVec.set(tx, ty, tz)

      // 부드러운 보간 (0.1은 속도, 낮을수록 부드러움)
      state.camera.position.lerp(vec, 0.1)
      state.camera.lookAt(lookAtVec)

      if (controlsRef.current) {
        controlsRef.current.target.lerp(lookAtVec, 0.1)
      }
    } else {
      // Global View: 기본 위치로 복귀
      vec.set(10, 10, 10)
      lookAtVec.set(0, 0, 0)
      state.camera.position.lerp(vec, 0.05)

      if (controlsRef.current) {
        controlsRef.current.target.lerp(lookAtVec, 0.05)
      }
    }
  })

  return <OrbitControls ref={controlsRef} makeDefault />
}