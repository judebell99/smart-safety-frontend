'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TransformControls, useGLTF } from '@react-three/drei';
import { supabase } from '../lib/supabase';

// 데이터베이스에 저장할 가구 아이템 인터페이스
interface FurnitureItem {
    id: string;
    name: string;
    model_path: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
}

const DEFAULT_ITEMS: FurnitureItem[] = [
    {
        id: 'table-round-1',
        name: 'Round Table 1',
        model_path: '/models/coffee_table_round_01_1k.gltf',
        position: [4, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'table-round-2',
        name: 'Round Table 2',
        model_path: '/models/coffee_table_round_01_1k.gltf',
        position: [6, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'table-round-3',
        name: 'Round Table 3',
        model_path: '/models/coffee_table_round_01_1k.gltf',
        position: [8, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'table-round-4',
        name: 'Round Table 4',
        model_path: '/models/coffee_table_round_01_1k.gltf',
        position: [10, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'table-round-5',
        name: 'Round Table 5',
        model_path: '/models/coffee_table_round_01_1k.gltf',
        position: [12, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'chaair-1',
        name: 'School Chair',
        model_path: '/models/SchoolChair_01_1k.gltf',
        position: [4.8, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'stool-1',
        name: 'Wooden Stool',
        model_path: '/models/wooden_stool_02_1k.gltf',
        position: [3.2, 0, 4],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    },
    {
        id: 'table-rect-1',
        name: 'Rectangular Table',
        model_path: '/models/wooden_table_02_1k.gltf',
        position: [-3, 0, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    }
];

interface FurnitureEditorProps {
    isEditMode: boolean;
    saveTrigger: number;
    setIsEditMode: (val: boolean) => void;
    transformMode: 'translate' | 'rotate' | 'scale';
}

export default function FurnitureEditor({ isEditMode, saveTrigger, setIsEditMode, transformMode }: FurnitureEditorProps) {
    const [items, setItems] = useState<FurnitureItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const transformRef = useRef<any>(null);

    useEffect(() => {
        fetchLayout();
    }, []);

    const fetchLayout = async () => {
        const { data, error } = await supabase.from('digital_twin_layouts').select('*');
        if (data && data.length > 0 && !error) {
            setItems(data as FurnitureItem[]);
        } else {
            setItems(DEFAULT_ITEMS);
        }
    };

    // 부모 컴포넌트(page.tsx)에서 '저장' 버튼을 눌렀을 때 반응
    useEffect(() => {
        if (saveTrigger > 0) {
            saveLayoutToSupabase();
        }
    }, [saveTrigger]);

    // 배치 모드가 종료되면 선택 초기화
    useEffect(() => {
        if (!isEditMode) setSelectedId(null);
    }, [isEditMode]);

    // 기즈모 조작이 끝났을 때(마우스를 뗐을 때) 로컬 상태 업데이트
    const handleTransformChange = () => {
        if (!transformRef.current || !selectedId) return;

        const target = transformRef.current.object;
        if (target) {
            setItems((prev) =>
                prev.map((item) =>
                    item.id === selectedId
                        ? {
                            ...item,
                            position: [target.position.x, target.position.y, target.position.z],
                            rotation: [target.rotation.x, target.rotation.y, target.rotation.z],
                            scale: [target.scale.x, target.scale.y, target.scale.z],
                        }
                        : item
                )
            );
        }
    };

    // 현재 배치 상태를 Supabase DB에 최종 저장하는 함수
    const saveLayoutToSupabase = async () => {
        try {
            const { data, error } = await supabase
                .from('digital_twin_layouts')
                .upsert(
                    items.map((item) => ({
                        id: item.id,
                        name: item.name,
                        model_path: item.model_path,
                        position: item.position,
                        rotation: item.rotation,
                        scale: item.scale,
                    }))
                );

            if (error) throw error;
            alert('💾 3D 디지털 트윈 배치 정보가 Supabase에 성공적으로 저장되었습니다!');
            setIsEditMode(false);
            setSelectedId(null);
        } catch (err: any) {
            console.error('Save Error:', err.message);
            alert('저장 실패: ' + err.message);
        }
    };

    return (
        <group>
            {items.map((item) => (
                <EditableModel
                    key={item.id}
                    item={item}
                    isEditMode={isEditMode}
                    isSelected={isEditMode && selectedId === item.id}
                    onSelect={() => {
                        if (isEditMode) setSelectedId(item.id);
                    }}
                    transformRef={transformRef}
                    onTransformChange={handleTransformChange}
                    transformMode={transformMode}
                />
            ))}
        </group>
    );
}

interface EditableModelProps {
    item: FurnitureItem;
    isEditMode: boolean;
    isSelected: boolean;
    onSelect: () => void;
    transformRef: React.RefObject<any>;
    onTransformChange: () => void;
    transformMode: 'translate' | 'rotate' | 'scale';
}

// 개별 가구 모델 로드 및 기즈모 결합 컴포넌트
function EditableModel({ item, isEditMode, isSelected, onSelect, transformRef, onTransformChange, transformMode }: EditableModelProps) {
    // drei의 useGLTF 훅으로 에셋 동적 로드
    const { scene } = useGLTF(item.model_path);
    // 메모리 누수 방지 및 다중 배치를 위해 씬 복제
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);

    const meshRef = useRef<any>(null);

    const modelNode = (
        <primitive
            ref={meshRef}
            object={clonedScene}
            position={item.position}
            rotation={item.rotation}
            scale={item.scale}
            onClick={(e: any) => {
                if (isEditMode) {
                    e.stopPropagation();
                    onSelect();
                }
            }}
        />
    );

    // 선택된 객체라면 기즈모(TransformControls)로 감싸서 렌der
    if (isSelected) {
        return (
            <TransformControls
                ref={transformRef}
                object={meshRef}
                mode={transformMode}
                onMouseUp={onTransformChange} // 드래그가 끝났을 때만 상태 업데이트 (포커스 초기화 방지)
            >
                {modelNode}
            </TransformControls>
        );
    }

    return modelNode;
}