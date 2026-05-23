import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  updateItem: (
    serviceId: number,
    checkInDate: Date,
    updates: Partial<Pick<CartItem, 'checkInDate' | 'quantity'>>
  ) => void;
  removeItem: (serviceId: number, checkInDate: Date) => void;
  removeItems: (itemsToRemove: Pick<CartItem, 'serviceId' | 'checkInDate'>[]) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  addItem: () => {},
  updateItem: () => {},
  removeItem: () => {},
  removeItems: () => {},
  clearCart: () => {},
  totalAmount: 0
});

// Base storage key; actual key is suffixed with user identifier (guest or user id)
const STORAGE_BASE = 'cart_user_';
const CART_GUEST_KEY = `${STORAGE_BASE}guest`;
const LEGACY_CART_KEY = 'cart';
export const CART_AUTH_CHANGED_EVENT = 'travelai-cart-auth-changed';

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCartItemKey = (item: Pick<CartItem, 'serviceId' | 'checkInDate'>) =>
  `${item.serviceId}-${formatDateKey(item.checkInDate)}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const parseCartItems = (value: string | null): CartItem[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Array<Omit<CartItem, 'checkInDate'> & { checkInDate: string }>;
    const validItems = parsed
      .map((item) => ({
        ...item,
        checkInDate: parseDateKey(item.checkInDate),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0
      }))
      .filter((item) => Number.isFinite(item.serviceId) && item.serviceName && !Number.isNaN(item.checkInDate.getTime()));

    const deduped = new Map<string, CartItem>();
    validItems.forEach((item) => {
      const key = getCartItemKey(item);
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, item);
        return;
      }

      existing.quantity += item.quantity;
      existing.price = item.price;
      existing.serviceName = item.serviceName;
    });

    return Array.from(deduped.values());
  } catch {
    return [];
  }
};

// Helpers for user-specific cart persistence and merging
const getCurrentUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const user = userStr ? JSON.parse(userStr) : null;
    // Support common id fields returned by backend and JWT claim names.
    const directId = user?.id || user?.userId || user?.userID || user?.Id;
    if (directId) return directId.toString();

    const payload = token ? decodeJwtPayload(token) : null;
    const claimId =
      payload?.sub ||
      payload?.nameid ||
      payload?.['nameidentifier'] ||
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    return claimId ? String(claimId) : null;
  } catch {
    return null;
  }
};

export const getCartStorageKeyFor = (userId: string | null) => `${STORAGE_BASE}${userId ?? 'guest'}`;

const serializeCartItems = (items: CartItem[]) =>
  items.map((item) => ({
    ...item,
    // Persist local date keys instead of ISO timestamps to avoid timezone date shifts.
    checkInDate: formatDateKey(item.checkInDate),
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: Number(item.price) || 0
  }));

export const saveCart = (items: CartItem[], userId: string | null = null) => {
  try {
    localStorage.setItem(getCartStorageKeyFor(userId), JSON.stringify(serializeCartItems(items)));
  } catch {
    // ignore quota errors silently
  }
};

export const loadCart = (userId: string | null = null): CartItem[] => {
  const storageKey = getCartStorageKeyFor(userId);
  const items = parseCartItems(localStorage.getItem(storageKey));

  if (items.length || userId) {
    return items;
  }

  const legacyItems = parseCartItems(localStorage.getItem(LEGACY_CART_KEY));
  if (legacyItems.length) {
    saveCart(legacyItems, null);
  }

  return legacyItems;
};

// Merge guest into user cart: same serviceId+date => sum quantities
export const mergeCart = (target: CartItem[], source: CartItem[]): CartItem[] => {
  const map = new Map<string, CartItem>();
  const keyOf = (it: CartItem) => `${it.serviceId}-${formatDateKey(it.checkInDate)}`;

  target.forEach((it) => map.set(keyOf(it), { ...it }));
  source.forEach((it) => {
    const k = keyOf(it);
    const existing = map.get(k);
    if (!existing) map.set(k, { ...it });
    else existing.quantity = (existing.quantity || 0) + (it.quantity || 0);
  });

  return Array.from(map.values());
};

export const clearSessionCart = () => {
  // Keep persisted guest/user carts. Logout should only clear auth/session data.
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {}
};

export const notifyCartAuthChanged = () => {
  window.dispatchEvent(new Event(CART_AUTH_CHANGED_EVENT));
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const userId = getCurrentUserId();
    // Load user cart if logged in, else load guest
    const userCart = loadCart(userId);
    // If logged in, attempt to merge guest cart automatically on initial load
    if (userId) {
      const guestCart = loadCart(null);
      if (guestCart.length) {
        const merged = mergeCart(userCart, guestCart);
        // persist merged user cart and clear guest
        saveCart(merged, userId);
        try {
          localStorage.removeItem(CART_GUEST_KEY);
        } catch {}
        return merged;
      }
    }
    return userCart;
  });

  // Persist current cart to user-specific storage key whenever items change
  useEffect(() => {
    const userId = getCurrentUserId();
    saveCart(items, userId);
  }, [items]);

  // Listen for login/logout (changes to `user` in localStorage) and sync carts
  useEffect(() => {
    const syncCartForAuthState = () => {
        const newUserId = getCurrentUserId();
        if (newUserId) {
          // logged in: load user's cart and merge guest if present
          const userCart = loadCart(newUserId);
          const guestCart = loadCart(null);
          const merged = guestCart.length ? mergeCart(userCart, guestCart) : userCart;
          setItems(merged);
          saveCart(merged, newUserId);
          if (guestCart.length) localStorage.removeItem(CART_GUEST_KEY);
        } else {
          // logged out: switch to guest cart
          const guest = loadCart(null);
          setItems(guest);
        }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        syncCartForAuthState();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(CART_AUTH_CHANGED_EVENT, syncCartForAuthState);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CART_AUTH_CHANGED_EVENT, syncCartForAuthState);
    };
  }, []);

  const addItem = useCallback((item: CartItem) => {
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
  }, []);

  const removeItem = useCallback((serviceId: number, checkInDate: Date) => {
    const itemKey = getCartItemKey({ serviceId, checkInDate });
    setItems((current) => current.filter((item) => getCartItemKey(item) !== itemKey));
  }, []);

  const updateItem = useCallback((
    serviceId: number,
    checkInDate: Date,
    updates: Partial<Pick<CartItem, 'checkInDate' | 'quantity'>>
  ) => {
    const originalKey = getCartItemKey({ serviceId, checkInDate });
    setItems((current) => {
      const existing = current.find((item) => getCartItemKey(item) === originalKey);
      if (!existing) {
        return current;
      }

      const updatedItem = {
        ...existing,
        ...updates,
        quantity: Math.max(1, Number(updates.quantity ?? existing.quantity) || 1)
      };
      const updatedKey = getCartItemKey(updatedItem);
      const withoutOriginal = current.filter((item) => getCartItemKey(item) !== originalKey);
      const mergeTarget = withoutOriginal.find((item) => getCartItemKey(item) === updatedKey);

      if (!mergeTarget) {
        return [...withoutOriginal, updatedItem];
      }

      return withoutOriginal.map((item) =>
        getCartItemKey(item) === updatedKey
          ? {
              ...item,
              serviceName: updatedItem.serviceName,
              quantity: item.quantity + updatedItem.quantity,
              price: updatedItem.price
            }
          : item
      );
    });
  }, []);

  const removeItems = useCallback((itemsToRemove: Pick<CartItem, 'serviceId' | 'checkInDate'>[]) => {
    const itemKeys = new Set(itemsToRemove.map((item) => getCartItemKey(item)));
    setItems((current) => current.filter((item) => !itemKeys.has(getCartItemKey(item))));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateItem,
      removeItem,
      removeItems,
      clearCart,
      totalAmount
    }),
    [addItem, clearCart, items, removeItem, removeItems, totalAmount, updateItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);

export default CartContext;
