import axiosClient from '../api/axiosClient';

export interface UserData {
  token: string;
  fullName: string;
  email: string;
  roleName: string;
  canCreateServices?: boolean;
  verificationStatus?: string;
}

/**
 * Lấy user từ localStorage
 */
export const getUser = (): UserData | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Lưu user vào localStorage
 */
export const setUser = (user: UserData): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

/**
 * Cập nhật thông tin partner profile vào user object
 * Gọi API /partner/profile và merge vào localStorage
 */
export const refreshPartnerStatus = async (): Promise<UserData | null> => {
  const user = getUser();
  if (!user || user.roleName?.toLowerCase() !== 'partner') {
    return user;
  }

  try {
    const response = await axiosClient.get('/partner/profile');
    const profile = response.data || {};
    
    // Merge thông tin profile vào user object
    const updatedUser: UserData = {
      ...user,
      canCreateServices: profile.canCreateServices || false,
      verificationStatus: profile.verificationStatus || 'Pending'
    };
    
    // Lưu lại vào localStorage
    setUser(updatedUser);
    
    return updatedUser;
  } catch (error) {
    console.error('Failed to refresh partner status:', error);
    return user;
  }
};

/**
 * Kiểm tra xem partner có thể tạo dịch vụ không
 */
export const canPartnerCreateServices = (): boolean => {
  const user = getUser();
  if (!user || user.roleName?.toLowerCase() !== 'partner') {
    return false;
  }
  return user.canCreateServices === true;
};
