import { create } from 'zustand';

interface NotificationsState {
  isModalOpen: boolean;
  triggerSource: string | null;
  openModal: (source: string) => void;
  closeModal: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  isModalOpen: false,
  triggerSource: null,
  openModal: (source) => set({ isModalOpen: true, triggerSource: source }),
  closeModal: () => set({ isModalOpen: false, triggerSource: null }),
}));
