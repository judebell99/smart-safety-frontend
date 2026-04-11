'use client'

import { useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { CanvasTexture, AdditiveBlending } from 'three'

export default function HeatmapFloor() {
  const textureRef = useRef<CanvasTexture | null>(null)

  // 1. 브라우저 메모리에 가상의 2D 캔버스(1024x1024) 생성
  const canvasMap = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    return canvas
  }, [])

  useEffect(() => {
    const ctx = canvasMap.getContext('2d')
    if (!ctx) return

    // 2. 모든 작업자의 이동을 한 번에 구독 (filter 조건 없음)
    const channel = supabase.channel('realtime:all_workers_heatmap')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'worker_status' },
        (payload) => {
          const { pos_x, pos_y } = payload.new

          // 3D 좌표(-15 ~ 15)를 2D 캔버스 픽셀(0 ~ 1024) 비율로 매핑
          const floorSize = 30; // 바닥 크기 30x30
          const mapScale = 1024 / floorSize;
          const cx = (pos_x + (floorSize / 2)) * mapScale;
          const cy = (pos_y + (floorSize / 2)) * mapScale;

          // 부드러운 방사형 그라데이션 브러시 생성
          const radius = 30; // 브러시 크기
          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          // 아주 옅은 빨간색을 겹겹이 칠함 (자주 지나갈수록 진해짐)
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Three.js 텍스처 업데이트 트리거
          if (textureRef.current) {
            textureRef.current.needsUpdate = true;
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [canvasMap])

  return (
    // 바닥 그리드 살짝 위(y: -0.01)에 깔리도록 설정 (Z-fighting 방지)
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[30, 30]} />
      {/* 빛이 겹칠수록 밝아지는 AdditiveBlending 적용 */}
      <meshBasicMaterial
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
      >
        <canvasTexture ref={textureRef} attach="map" image={canvasMap} />
      </meshBasicMaterial>
    </mesh>
  )
}