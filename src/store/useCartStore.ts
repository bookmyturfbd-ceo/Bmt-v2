import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique cart item id (e.g. productId-size)
  productId: string;
  name: string;
  sizeLabel: string;
  price: number; // The salePrice or basePrice (whichever is lower)
  quantity: number;
  imageUrl: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (item) => set((state) => {
        const id = `${item.productId}-${item.sizeLabel}`;
        const existing = state.items.find((i) => i.id === id);
        if (existing) {
          return {
            items: state.items.map((i) => 
              i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i
            ),
            isOpen: true
          };
        }
        return { items: [...state.items, { ...item, id }], isOpen: true };
      }),

      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      })),

      updateQuantity: (id, quantity) => set((state) => ({
        items: quantity <= 0 
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => i.id === id ? { ...i, quantity } : i)
      })),

      clearCart: () => set({ items: [] }),

      setIsOpen: (isOpen) => set({ isOpen }),

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'bmt-shop-cart', // local storage key
    }
  )
);
