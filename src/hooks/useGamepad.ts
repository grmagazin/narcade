import { useCallback, useEffect, useState } from 'react';
import type { GamepadMappingProfile } from '../types';

const GAMEPAD_MAP_KEY = 'ngames_gamepad_map_v1';

export const DEFAULT_GAMEPAD_MAPPING: GamepadMappingProfile = {
  bButton: 0,
  aButton: 1,
  yButton: 2,
  xButton: 3,
  lButton: 4,
  rButton: 5,
  selectButton: 8,
  startButton: 9,
  deadzone: 0.2,
};

export interface LiveGamepadSnapshot {
  index: number;
  id: string;
  buttonsCount: number;
  axesCount: number;
  pressedButtons: number[];
  axes: number[];
}

export function loadGamepadMapping(): GamepadMappingProfile {
  try {
    const raw = localStorage.getItem(GAMEPAD_MAP_KEY);
    if (!raw) return DEFAULT_GAMEPAD_MAPPING;
    return { ...DEFAULT_GAMEPAD_MAPPING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_GAMEPAD_MAPPING;
  }
}

export function useGamepad(pollLiveInputs = false) {
  const [gamepads, setGamepads] = useState<LiveGamepadSnapshot[]>([]);
  const [mapping, setMapping] = useState<GamepadMappingProfile>(() => loadGamepadMapping());

  const readSnapshots = useCallback((): LiveGamepadSnapshot[] => {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return [];
    }
    const list = Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[];
    return list.map((gp) => {
      const pressedButtons: number[] = [];
      gp.buttons.forEach((btn, idx) => {
        if (btn.pressed || btn.value > 0.5) {
          pressedButtons.push(idx);
        }
      });
      return {
        index: gp.index,
        id: gp.id.split('(')[0].trim() || `Gamepad ${gp.index + 1}`,
        buttonsCount: gp.buttons.length,
        axesCount: gp.axes.length,
        pressedButtons,
        axes: Array.from(gp.axes).map((a) => Number(a.toFixed(2))),
      };
    });
  }, []);

  useEffect(() => {
    const sync = () => setGamepads(readSnapshots());
    sync();
    window.addEventListener('gamepadconnected', sync);
    window.addEventListener('gamepaddisconnected', sync);
    return () => {
      window.removeEventListener('gamepadconnected', sync);
      window.removeEventListener('gamepaddisconnected', sync);
    };
  }, [readSnapshots]);

  useEffect(() => {
    if (!pollLiveInputs) return;
    let rafId = 0;
    const loop = () => {
      setGamepads(readSnapshots());
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [pollLiveInputs, readSnapshots]);

  const updateMapping = useCallback((next: GamepadMappingProfile) => {
    setMapping(next);
    try {
      localStorage.setItem(GAMEPAD_MAP_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resetMapping = useCallback(() => {
    updateMapping(DEFAULT_GAMEPAD_MAPPING);
  }, [updateMapping]);

  return {
    gamepads,
    mapping,
    updateMapping,
    resetMapping,
  };
}
