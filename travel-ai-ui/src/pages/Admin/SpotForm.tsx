
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { Upload, Save } from 'lucide-react';

interface Destination {
    id: number;
    name: string;
}

const SpotForm = () => {
    const navigate = useNavigate();

    const [destinations, setDestinations] = useState<Destination[]>([]);
    const [destinationId, setDestinationId] = useState('');
    const [location, setLocation] = useState('');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');

    // 🔥 Load danh sách destination
    useEffect(() => {
    axiosClient.get('/destinations')
        .then(res => {
            console.log("DESTINATIONS:", res.data);

            // 🔥 FIX Ở ĐÂY
            setDestinations(res.data?.data || []);
        })
        .catch(err => {
            console.error(err);
            alert("❌ Không load được danh sách địa điểm");
        });
}, []);

    // 🔥 Khi chọn destination → set location
    const handleSelectDestination = (id: string) => {
        setDestinationId(id);

        const selected = destinations.find(d => d.id.toString() === id);
        if (selected) {
            setLocation(selected.name); // 👉 auto location
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!destinationId) {
            alert("❌ Vui lòng chọn địa điểm!");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('location', location);
        formData.append('destinationId', destinationId);

        if (image) {
            formData.append('image', image);
        }

        try {
            await axiosClient.post('/spots', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert("✅ Thêm địa danh thành công!");
            navigate(`/destinations/${destinationId}`);

        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || "❌ Lỗi khi thêm địa danh");
        }
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-2xl mt-10">
            <h1 className="text-3xl font-black text-slate-900 mb-8">
                Add New Spot
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 🔥 Dropdown chọn destination */}
                <div>
                    <label className="block text-sm font-bold mb-2">
                        Chọn địa điểm
                    </label>
                    <select
                        className="w-full p-4 border rounded-2xl"
                        value={destinationId}
                        onChange={(e) => handleSelectDestination(e.target.value)}
                        required
                    >
                        <option value="">-- Chọn địa điểm --</option>
                        {destinations.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-bold mb-2">
                        Tên địa danh
                    </label>
                    <input
                        className="w-full p-4 border rounded-2xl"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-bold mb-2">
                        Mô tả
                    </label>
                    <textarea
                        className="w-full p-4 border rounded-2xl h-32"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                {/* Image */}
                <div>
                    <label className="block text-sm font-bold mb-2">
                        Ảnh địa danh
                    </label>

                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-blue-50 text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-100 flex items-center gap-2">
                            <Upload size={20} /> Choose File
                            <input
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                                accept="image/*"
                            />
                        </label>

                        {preview && (
                            <img
                                src={preview}
                                className="size-20 rounded-xl object-cover border"
                            />
                        )}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                    <Save size={20} /> Save Spot
                </button>
            </form>
        </div>
    );
};

export default SpotForm;