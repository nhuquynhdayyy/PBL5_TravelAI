import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export const usePreferences = () => {
    const [pref, setPref] = useState({
        travelStyle: '',
        budgetLevel: 0,
        travelPace: 0,
        cuisinePref: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Lấy dữ liệu từ API
    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/preferences');
            if (res.data.success && res.data.data) {
                setPref(res.data.data);
            }
        } catch (err) {
            console.error("Chưa có dữ liệu cũ");
        } finally {
            setLoading(false);
        }
    };

    // Gửi dữ liệu cập nhật lên API
    const updatePreferences = async (data: any) => {
        setSaving(true);
        try {
            await axiosClient.put('/preferences', data);
            return { success: true };
        } catch (err) {
            return { success: false, error: err };
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchPreferences();
    }, []);

    return { pref, setPref, loading, saving, updatePreferences };
};