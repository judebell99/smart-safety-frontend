'use client'

import { useFrame } from '@react-three/fiber'
import { Vector3, Quaternion } from 'three'
import { OrbitControls } from '@react-three/drei'
import { useRef, useEffect } from 'react'

interface CameraControllerProps {
  targetId: string | null;
  workerPositions: Record<string, [number, number, number]>;
  defaultTarget?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}

export default function CameraController({
  targetId,
  workerPositions,
  defaultTarget = [0, 0, 0],
  minDistance = 2,
  maxDistance = 50,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
}: CameraControllerProps) {
  const controlsRef = useRef<any>(null)

  // 내부 계산용 벡터
  const targetPos = new Vector3()
  const offset = new Vector3()

  // 타겟이 변경될 때 카메라의 상대적 거리를 초기화하기 위한 장치
  useEffect(() => {
    if (targetId && workerPositions[targetId] && controlsRef.current) {
      const [tx, ty, tz] = workerPositions[targetId]
      const currentTarget = controlsRef.current.target

      // 현재 카메라 위치와 타겟 사이의 오프셋을 계산하여 유지함
      offset.copy(controlsRef.current.object.position).sub(new Vector3(tx, ty, tz))
    }
  }, [targetId])

  useFrame((state, delta) => {
    if (!controlsRef.current) return

    if (targetId && workerPositions[targetId]) {
      // 1. 타겟 좌표 설정 (R3F 좌표계: x, z, y 순서 대응 확인 필요)
      const [tx, ty, tz] = workerPositions[targetId]
      targetPos.set(tx, ty, tz)

      // 2. OrbitControls의 타겟(중심점)을 작업자 위치로 부드럽게 이동
      // lerp의 수치(0.1)를 조절하여 추적의 쫀득함을 결정합니다.
      controlsRef.current.target.lerp(targetPos, 0.1)

      // 3. 카메라 본체 이동 (사용자가 조작한 오프셋 거리를 유지하며 따라감)
      // 작업자가 이동한 만큼 카메라 좌표도 동일하게 이동시킵니다.
      const idealPosition = targetPos.clone().add(offset)

      // 사용자가 마우스로 조작 중일 때는 오프셋을 실시간 갱신하여 
      // 조작이 끝난 시점의 거리를 유지하도록 합니다.
      if (controlsRef.current.enabled) {
        offset.copy(state.camera.position).sub(targetPos)
      }
    } else {
      // 타겟이 없을 때 (Global View): 설정된 기본 타겟으로 부드럽게 복귀
      const origin = new Vector3(...defaultTarget)
      controlsRef.current.target.lerp(origin, 0.05)
    }

    controlsRef.current.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={minPolarAngle}
      maxPolarAngle={maxPolarAngle}
    />
  )
}