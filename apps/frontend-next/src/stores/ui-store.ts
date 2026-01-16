import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ModalState {
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
}

interface UIState extends ModalState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modal
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Selected items (for edit/delete operations)
  selectedItem: unknown | null;
  setSelectedItem: (item: unknown | null) => void;
  clearSelectedItem: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Sidebar state
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Modal state
      activeModal: null,
      modalData: null,
      openModal: (id, data) => set({ activeModal: id, modalData: data ?? null }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Selected item state
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item }),
      clearSelectedItem: () => set({ selectedItem: null }),
    }),
    { name: 'ui-store' }
  )
);

// Selector hooks for performance optimization
export const useSidebar = () => useUIStore((state) => ({
  isOpen: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
}));

export const useModal = () => useUIStore((state) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  open: state.openModal,
  close: state.closeModal,
}));

export const useSelectedItem = <T>() => useUIStore((state) => ({
  item: state.selectedItem as T | null,
  setItem: state.setSelectedItem,
  clear: state.clearSelectedItem,
}));
