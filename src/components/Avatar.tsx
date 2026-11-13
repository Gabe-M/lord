import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";

interface AvatarProps {
  currentIndex?: number;
  onExpressionChange?: (index: number) => void;
}

const EXPRESSION_NODES = [
  "Verity_1",
  "Verity_4",
  "Verity_10",
  "Verity_13",
  "Verity_16",
  "Verity_19",
  "Verity_22",
  "Verity_25",
  "Verity_28",
  "Verity_31",
  "Verity_34",
  "Verity_37",
  "Verity_7",
] as const;

const INITIAL_INDEX = 11;

const KEY_TO_INDEX: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "8": 7,
  "9": 8,
  "0": 9,
  "-": 10,
  "=": 11,
  "_": 12,
  "+": 12,
};

const NORMALIZE_SCALE = 0.8;

export function Avatar({ currentIndex: controlledIndex, onExpressionChange }: AvatarProps) {
  const { scene } = useGLTF("/models/source/avatar.glb");
  const [internalIndex, setInternalIndex] = useState(INITIAL_INDEX);
  const groupRef = useRef<Group>(null);

  const activeIndex = controlledIndex ?? internalIndex;

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    EXPRESSION_NODES.forEach((name) => {
      const node = cloned.getObjectByName(name);
      if (node) {
        node.position.set(0, 0, 0);
      }
    });

    return cloned;
  }, [scene]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key in KEY_TO_INDEX) {
        const next = KEY_TO_INDEX[key];
        setInternalIndex(next);
        onExpressionChange?.(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExpressionChange]);

  useEffect(() => {
    const targetName = EXPRESSION_NODES[activeIndex] ?? EXPRESSION_NODES[INITIAL_INDEX];

    EXPRESSION_NODES.forEach((name) => {
      const node = clonedScene.getObjectByName(name);
      if (node) {
        node.visible = name === targetName;
      }
    });
  }, [clonedScene, activeIndex]);

  return (
    <group ref={groupRef} scale={NORMALIZE_SCALE}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default Avatar;

useGLTF.preload("/models/source/avatar.glb");
