import { create } from 'zustand';

type AnonymousState = {
  playCount: number;
  hasSeenSignUpWall: boolean;
  signUpWallVisible: boolean;
  signUpWallTrigger: string;

  incrementPlayCount: () => void;
  shouldShowSignUpWall: () => boolean;
  showSignUpWall: (trigger: string) => void;
  hideSignUpWall: () => void;
};

const SIGNUP_WALL_THRESHOLD = 2; // Show after 2 plays

export const useAnonymousStore = create<AnonymousState>((set, get) => ({
  playCount: 0,
  hasSeenSignUpWall: false,
  signUpWallVisible: false,
  signUpWallTrigger: '',

  incrementPlayCount: () => set((s) => ({ playCount: s.playCount + 1 })),

  shouldShowSignUpWall: () => {
    const { playCount, hasSeenSignUpWall } = get();
    return playCount >= SIGNUP_WALL_THRESHOLD && !hasSeenSignUpWall;
  },

  showSignUpWall: (trigger: string) =>
    set({ signUpWallVisible: true, signUpWallTrigger: trigger, hasSeenSignUpWall: true }),

  hideSignUpWall: () => set({ signUpWallVisible: false }),
}));
