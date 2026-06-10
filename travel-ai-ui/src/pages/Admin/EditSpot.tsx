import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Upload, Save, ArrowLeft, MapPin } from 'lucide-react';

const EditSpot = () => {
    const { id } = useParams(); // spotId
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [avgTimeSpent, setAvgTimeSpent] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);

    // Load data cũ
    useEffect(() => {
        const fetchSpot = async () => {
            try {
                const res = await axiosClient.get(`/spots/${id}`);
                const data = res.data.data;

                if (data) {
                    setName(data.name || '');
                    setLatitude(data.latitude?.toString() || '');
                    setLongitude(data.longitude?.toString() || '');
                    setAvgTimeSpent(data.avgTimeSpent?.toString() || '');
                    setOpeningHours(data.openingHours || '');
                    setDescription(data.description || '');
                    
                    if (data.imageUrl) {
                        const fullUrl = data.imageUrl.startsWith('http') 
                            ? data.imageUrl 
                            : `http://localhost:5134${data.imageUrl}`;
                        setPreview(fullUrl);
                    }
                }
            } catch (err) {
                console.error(err);
                alert('Không load được dữ liệu');
                navigate(-1); 
            }
        };

        if (id) fetchSpot();
    }, [id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData();
        formData.append('Name', name);
        formData.append('Latitude', latitude);
        formData.append('Longitude', longitude);
        formData.append('AvgTimeSpent', avgTimeSpent);
        formData.append('OpeningHours', openingHours);
        formData.append('Description', description);
        if (image) formData.append('Image', image);

        try {
            await axiosClient.put(`/spots/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Cập nhật thành công!');
            navigate(-1);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Lỗi update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 font-bold">
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="admin-card p-8">
                <div className="flex items-center gap-2 mb-6">
                    <MapPin />
                    <h2 className="text-2xl font-bold">Edit Spot</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="admin-input" required />

                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" className="admin-input" />
                        <input type="number" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" className="admin-input" />
                    </div>

                    <input type="number" value={avgTimeSpent} onChange={e => setAvgTimeSpent(e.target.value)} placeholder="Avg Time" className="admin-input" />

                    <input value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="Opening Hours" className="admin-input" />

                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="admin-input" />

                    <div>
                        <label className="admin-button-secondary w-fit cursor-pointer">
                            <Upload size={16} /> Upload
                            <input type="file" hidden onChange={handleFileChange} />
                        </label>

                        {preview && (
                            <img src={preview} className="mt-4 w-48 h-32 object-cover rounded" />
                        )}
                    </div>

                    <button disabled={loading} className="admin-button-primary w-full py-3">
                        <Save size={18} /> {loading ? 'Saving...' : 'Update'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditSpot; 
