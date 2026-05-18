import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface CartItem {
  serviceId: number;
  serviceName: string;
  checkInDate: Date;
  quantity: number;
  price: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: number, checkInDate: Date) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  totalAmount: 0
});

const storageKey = 'travelai_cart';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCartItemKey = (item: Pick<CartItem, 'serviceId' | 'checkInDate'>) =>
  `${item.serviceId}-${formatDateKey(item.checkInDate)}`;

const parseCartItems = (value: string | null): CartItem[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Array<Omit<CartItem, 'checkInDate'> & { checkInDate: string }>;
    return parsed
      .map((item) => ({
        ...item,
        checkInDate: new Date(item.checkInDate),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0
      }))
      .filter((item) => Number.isFinite(item.serviceId) && item.serviceName && !Number.isNaN(item.checkInDate.getTime()));
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => parseCartItems(localStorage.getItem(storageKey)));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((current) => {
      const itemKey = getCartItemKey(item);
      const existing = current.find((cartItem) => getCartItemKey(cartItem) === itemKey);
      if (!existing) {
        return [...current, item];
      }

      return current.map((cartItem) =>
        getCartItemKey(cartItem) === itemKey
          ? {
              ...cartItem,
              serviceName: item.serviceName,
              checkInDate: item.checkInDate,
              quantity: cartItem.quantity + item.quantity,
              price: item.price
            }
          : cartItem
      );
    });
  };

  const removeItem = (serviceId: number, checkInDate: Date) => {
    const itemKey = getCartItemKey({ serviceId, checkInDate });
    setItems((current) => current.filter((item) => getCartItemKey(item) !== itemKey));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clearCart,
      totalAmount
    }),
    [items, totalAmount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContext;
