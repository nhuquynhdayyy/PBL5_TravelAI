import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import axiosClient from '../api/axiosClient';

export interface CartItem {
  cartItemId?: number; // ID từ database (nếu có)
  serviceId: number;
  serviceName: string;
  checkInDate: Date;
  checkOutDate?: Date;
  quantity: number;
  price: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (serviceId: number, checkInDate: Date, checkOutDate?: Date) => Promise<void>;
  updateQuantity: (serviceId: number, checkInDate: Date, quantity: number, checkOutDate?: Date) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  totalAmount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: async () => {},
  removeItem: async () => {},
  updateQuantity: async () => {},
  clearCart: () => {},
  syncCart: async () => {},
  totalAmount: 0,
  isLoading: false
});

const storageKey = 'travelai_cart';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCartItemKey = (item: Pick<CartItem, 'serviceId' | 'checkInDate' | 'checkOutDate'>) =>
  `${item.serviceId}-${formatDateKey(item.checkInDate)}-${item.checkOutDate ? formatDateKey(item.checkOutDate) : 'single'}`;

const parseCartItems = (value: string | null): CartItem[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Array<Omit<CartItem, 'checkInDate' | 'checkOutDate'> & { checkInDate: string; checkOutDate?: string }>;
    return parsed
      .map((item) => ({
        ...item,
        checkInDate: new Date(item.checkInDate),
        checkOutDate: item.checkOutDate ? new Date(item.checkOutDate) : undefined,
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
  const [isLoading, setIsLoading] = useState(false);

  // Đồng bộ cart với localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  // Kiểm tra xem user đã đăng nhập chưa
  const isLoggedIn = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  // Sync cart từ database khi component mount (nếu đã đăng nhập)
  const syncCart = useCallback(async () => {
    if (!isLoggedIn()) {
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await axiosClient.get('/cart');
      
      // Convert database items sang CartItem format
      const dbItems: CartItem[] = data.items.map((item: any) => ({
        cartItemId: item.cartItemId,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        checkInDate: new Date(item.checkInDate),
        checkOutDate: item.checkOutDate ? new Date(item.checkOutDate) : undefined,
        quantity: item.quantity,
        price: item.priceAtBooking
      }));

      setItems(dbItems);
    } catch (error) {
      console.error('Error syncing cart from database:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Thêm item vào cart
  const addItem = useCallback(async (item: CartItem) => {
    // Nếu chưa đăng nhập, lưu vào localStorage
    if (!isLoggedIn()) {
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
                checkOutDate: item.checkOutDate,
                quantity: cartItem.quantity + item.quantity,
                price: item.price
              }
            : cartItem
        );
      });
      return;
    }

    // Nếu đã đăng nhập, gọi API
    try {
      setIsLoading(true);
      await axiosClient.post('/cart', {
        serviceId: item.serviceId,
        quantity: item.quantity,
        priceAtBooking: item.price,
        checkInDate: formatDateKey(item.checkInDate),
        checkOutDate: item.checkOutDate ? formatDateKey(item.checkOutDate) : null
      });

      // Sau khi thêm thành công, sync lại từ database
      await syncCart();
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      alert(error.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, syncCart]);

  // Xóa item khỏi cart
  const removeItem = useCallback(async (serviceId: number, checkInDate: Date, checkOutDate?: Date) => {
    // Nếu chưa đăng nhập, xóa khỏi localStorage
    if (!isLoggedIn()) {
      const itemKey = getCartItemKey({ serviceId, checkInDate, checkOutDate });
      setItems((current) => current.filter((item) => getCartItemKey(item) !== itemKey));
      return;
    }

    // Nếu đã đăng nhập, tìm cartItemId và gọi API
    try {
      setIsLoading(true);
      const itemKey = getCartItemKey({ serviceId, checkInDate, checkOutDate });
      const itemToRemove = items.find((item) => getCartItemKey(item) === itemKey);

      if (!itemToRemove?.cartItemId) {
        console.error('Cart item ID not found');
        return;
      }

      await axiosClient.delete(`/cart/${itemToRemove.cartItemId}`);

      // Sau khi xóa thành công, sync lại từ database
      await syncCart();
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      alert(error.response?.data?.message || 'Không thể xóa khỏi giỏ hàng');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, items, syncCart]);

  // Cập nhật số lượng của item
  const updateQuantity = useCallback(async (serviceId: number, checkInDate: Date, quantity: number, checkOutDate?: Date) => {
    if (quantity <= 0) return;

    // Nếu chưa đăng nhập, cập nhật trong localStorage
    if (!isLoggedIn()) {
      setItems((current) => {
        const itemKey = getCartItemKey({ serviceId, checkInDate, checkOutDate });
        return current.map((cartItem) =>
          getCartItemKey(cartItem) === itemKey
            ? { ...cartItem, quantity }
            : cartItem
        );
      });
      return;
    }

    // Nếu đã đăng nhập, tìm cartItemId và gọi API
    try {
      setIsLoading(true);
      const itemKey = getCartItemKey({ serviceId, checkInDate, checkOutDate });
      const itemToUpdate = items.find((item) => getCartItemKey(item) === itemKey);

      if (!itemToUpdate?.cartItemId) {
        console.error('Cart item ID not found');
        return;
      }

      await axiosClient.put(`/cart/${itemToUpdate.cartItemId}`, {
        quantity
      });

      // Sau khi cập nhật thành công, sync lại từ database
      await syncCart();
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật số lượng');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, items, syncCart]);

  // Xóa toàn bộ cart (chỉ xóa trong memory, không xóa database)
  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(storageKey);
  }, []);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      syncCart,
      totalAmount,
      isLoading
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, syncCart, totalAmount, isLoading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContext;
