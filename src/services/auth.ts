import { Shop, UserSession } from '../types';

const SESSION_STORAGE_KEY = 'sanad_user_session_v1';
const CURRENT_SHOP_KEY = 'sanad_active_shop_id_v1';
const SHOPS_CACHE_KEY = 'sanad_shops_cache_v1';

export const getStoredShops = (): Shop[] => {
  try {
    const raw = localStorage.getItem(SHOPS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Shop[];
    if (!Array.isArray(parsed)) return [];
    const safeShops = parsed.map(sanitizeShop);
    localStorage.setItem(SHOPS_CACHE_KEY, JSON.stringify(safeShops));
    return safeShops;
  } catch {
    return [];
  }
};

const sanitizeShop = (shop: Shop): Shop => {
  const { password: _password, ...safeShop } = shop as Shop & { password?: string };
  return safeShop;
};

export const saveStoredShops = (shops: Shop[]) => {
  localStorage.setItem(SHOPS_CACHE_KEY, JSON.stringify(shops.map(sanitizeShop)));
};

export const getCurrentSession = (): UserSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserSession;
    if (!session.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      setCurrentSession(null);
      window.dispatchEvent(new CustomEvent('sanad:session-expired'));
      return null;
    }
    return session;
  } catch {
    setCurrentSession(null);
    window.dispatchEvent(new CustomEvent('sanad:session-expired'));
    return null;
  }
};

export const setCurrentSession = (session: UserSession | null) => {
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(CURRENT_SHOP_KEY, session.currentShopId);
    return;
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(CURRENT_SHOP_KEY);
};

export const getActiveShopId = (): string => {
  const session = getCurrentSession();
  if (session?.currentShopId && session.allowedShopIds.includes(session.currentShopId)) {
    return session.currentShopId;
  }
  return session?.allowedShopIds[0] || '';
};

export const setActiveShopId = (shopId: string) => {
  const session = getCurrentSession();
  if (!session || !session.allowedShopIds.includes(shopId)) {
    throw new Error('لا تملك صلاحية اختيار هذا المحل.');
  }
  const shop = getStoredShops().find((item) => item.shopId === shopId);
  session.currentShopId = shopId;
  session.shopName = shop?.shopName || session.shopName;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(CURRENT_SHOP_KEY, shopId);
};

export const isAuthenticated = (): boolean => Boolean(getCurrentSession());

export const isAdmin = (): boolean => getCurrentSession()?.role === 'admin';

export const getAvailableShops = (shops: Shop[] = getStoredShops()): Shop[] => {
  const session = getCurrentSession();
  if (!session) return [];
  return shops.filter(
    (shop) => session.allowedShopIds.includes(shop.shopId) && shop.status === 'active'
  );
};

export const logout = async () => {
  setCurrentSession(null);
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string }> => {
  throw new Error('Google OAuth غير مهيأ لهذا المشروع.');
};

export const getAccessToken = async (): Promise<string | null> => null;
