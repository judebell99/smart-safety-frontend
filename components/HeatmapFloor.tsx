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

    // 2. DB에서 최근 500개 위치 데이터를 가져와 블록형 히트맵으로 렌더링
    const fetchAndDrawHeatmap = async () => {
      const { data, error } = await supabase
        .from('worker_logs')
        .select('pos_x, pos_y')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error || !data) return

      // 이전 화면 초기화
      ctx.clearRect(0, 0, 1024, 1024)

      const floorSize = 30
      const gridSize = 60 // 30x30 공간을 60x60 그리드로 분할 (한 칸당 0.5m)
      const cellSize = 1024 / gridSize

      // 그리드 카운트 배열 초기화
      const grid: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0))
      let maxCount = 0

      // 데이터 블록 단위 평탄화 및 카운트
      data.forEach((log) => {
        const gridX = Math.floor(((log.pos_x + (floorSize / 2)) / floorSize) * gridSize)
        const gridY = Math.floor(((log.pos_y + (floorSize / 2)) / floorSize) * gridSize)

        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
          grid[gridX][gridY] += 1
          if (grid[gridX][gridY] > maxCount) {
            maxCount = grid[gridX][gridY]
          }
        }
      })

      if (maxCount === 0) maxCount = 1

      // 블록 그리기
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const count = grid[x][y]
          if (count > 0) {
            const intensity = count / maxCount
            // 강도(intensity)에 따라 파란색(240) -> 녹색 -> 노란색 -> 빨간색(0)으로 변화
            const hue = (1 - intensity) * 240
            const alpha = 0.2 + (intensity * 0.6) // 빈도에 따라 불투명도 증가
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
          }
        }
      }

      // Three.js 텍스처 업데이트 트리거
      if (textureRef.current) {
        textureRef.current.needsUpdate = true
      }
    }

    // 마운트 시 즉시 실행하고, 이후 5초마다 동기화
    fetchAndDrawHeatmap()
    const intervalId = setInterval(fetchAndDrawHeatmap, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [canvasMap])

  return (
    // 바닥 그리드 살짝 위(y: -0.01)에 깔리도록 설정 (Z-fighting 방지)
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
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