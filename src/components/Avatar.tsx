import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Quaternion,
  Vector2,
  Vector3,
  type Group,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";

interface AvatarProps {
  currentIndex?: number;
  onExpressionChange?: (index: number) => void;
  followMouse?: boolean;
  mouseLookTarget?: { current: { x: number; y: number } };
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
const MAX_LOOK_ANGLE = (35 * Math.PI) / 180;
const FRONT_LOOK_RADIUS = 0.12;
const FRONT_PITCH = (10 * Math.PI) / 180;

export function Avatar({
  currentIndex: controlledIndex,
  onExpressionChange,
  followMouse = false,
  mouseLookTarget,
}: AvatarProps) {
  const { scene } = useGLTF("/models/source/avatar.glb");
  const [internalIndex, setInternalIndex] = useState(INITIAL_INDEX);
  const groupRef = useRef<Group>(null);
  const wasFollowingMouseRef = useRef(false);
  const camera = useThree((state) => state.camera);
  const raycaster = useThree((state) => state.raycaster);
  const lookScratch = useMemo(
    () => ({
      ndc: new Vector2(),
      cameraDirection: new Vector3(),
      cameraQuaternion: new Quaternion(),
      cameraRight: new Vector3(),
      cameraUp: new Vector3(),
      neutralDirection: new Vector3(),
      targetDirection: new Vector3(),
      targetRotation: new Quaternion(),
      limitingRotation: new Quaternion(),
      identity: new Quaternion(),
      defaultRotation: new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        Math.PI,
      ).multiply(
        new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), FRONT_PITCH),
      ),
    }),
    [],
  );

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

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!followMouse || !mouseLookTarget) {
      wasFollowingMouseRef.current = false;
      group.quaternion.slerp(
        lookScratch.defaultRotation,
        1 - Math.exp(-12 * delta),
      );
      return;
    }

    if (!wasFollowingMouseRef.current) {
      group.quaternion.copy(lookScratch.defaultRotation);
      wasFollowingMouseRef.current = true;
      return;
    }

    if (
      Math.hypot(mouseLookTarget.current.x, mouseLookTarget.current.y) <
      FRONT_LOOK_RADIUS
    ) {
      group.quaternion.slerp(
        lookScratch.defaultRotation,
        1 - Math.exp(-12 * delta),
      );
      return;
    }

    raycaster.setFromCamera(
      lookScratch.ndc.set(mouseLookTarget.current.x, -mouseLookTarget.current.y),
      camera,
    );
    camera.getWorldDirection(lookScratch.cameraDirection);
    camera.getWorldQuaternion(lookScratch.cameraQuaternion);
    lookScratch.cameraRight
      .set(1, 0, 0)
      .applyQuaternion(lookScratch.cameraQuaternion);
    lookScratch.cameraUp
      .set(0, 1, 0)
      .applyQuaternion(lookScratch.cameraQuaternion);
    lookScratch.neutralDirection
      .copy(lookScratch.cameraDirection)
      .negate();

    lookScratch.targetDirection
      .copy(lookScratch.neutralDirection)
      .multiplyScalar(raycaster.ray.direction.dot(lookScratch.cameraDirection))
      .addScaledVector(
        lookScratch.cameraRight,
        raycaster.ray.direction.dot(lookScratch.cameraRight),
      )
      .addScaledVector(
        lookScratch.cameraUp,
        raycaster.ray.direction.dot(lookScratch.cameraUp),
      )
      .normalize();

    const lookAngle = lookScratch.neutralDirection.angleTo(
      lookScratch.targetDirection,
    );
    if (lookAngle > MAX_LOOK_ANGLE) {
      lookScratch.limitingRotation.setFromUnitVectors(
        lookScratch.neutralDirection,
        lookScratch.targetDirection,
      );
      lookScratch.limitingRotation.slerp(
        lookScratch.identity,
        1 - MAX_LOOK_ANGLE / lookAngle,
      );
      lookScratch.targetDirection
        .copy(lookScratch.neutralDirection)
        .applyQuaternion(lookScratch.limitingRotation)
        .normalize();
    }

    lookScratch.targetRotation.setFromUnitVectors(
      lookScratch.neutralDirection,
      lookScratch.targetDirection,
    );
    lookScratch.targetRotation.premultiply(lookScratch.defaultRotation);
    group.quaternion.slerp(
      lookScratch.targetRotation,
      1 - Math.exp(-16 * delta),
    );
  });

  return (
    <group ref={groupRef} scale={NORMALIZE_SCALE}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default Avatar;

useGLTF.preload("/models/source/avatar.glb");
