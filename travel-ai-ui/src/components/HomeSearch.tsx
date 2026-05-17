import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, Compass, ChevronDown, X,
    ArrowRight, Loader2, Filter
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

type ResultItem = {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    type: 'destination' | 'spot';
    destinationName?: string;
};

const HomeSearch: React.FC = () => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState('');
    const [destinations, setDestinations] = useState<any[]>([]);
    const [allSpots, setAllSpots] = useState<any[]>([]);
    const [selectedDestId, setSelectedDestId] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const getImageUrl = (url: string) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `http://localhost:5134${url}`;
    };

    // Fetch destinations on mount
    useEffect(() => {
        axiosClient.get('/destinations')
            .then((res: any) => setDestinations(res.data.data || []))
            .catch(console.error);
    }, []);

    // Fetch spots when filter changes
    useEffect(() => {
        if (selectedDestId === 'all') {
            axiosClient.get('/spots')
                .then((res: any) => setAllSpots(res.data.data || []))
                .catch(() => {
                    // fallback: fetch all via destinations
                    Promise.all(
                        destinations.map((d: any) =>
                            axiosClient.get(`/spots/by-destination/${d.id || d.destinationId}`)
                                .then((r: any) => r.data.data || []).catch(() => [])
                        )
                    ).then((arr: any[]) => setAllSpots(arr.flat()));
                });
        } else {
            axiosClient.get(`/spots/by-destination/${selectedDestId}`)
                .then((res: any) => setAllSpots(res.data.data || []))
                .catch(console.error);
        }
    }, [selectedDestId, destinations.length]);

    // Build combined results
    const results = useMemo((): ResultItem[] => {
        if (!query.trim()) return [];
        const q = query.toLowerCase().trim();

        const destResults: ResultItem[] = destinations
            .filter(d => (d.name || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
            .slice(0, 3)
            .map(d => ({
                id: d.id || d.destinationId,
                name: d.name,
                description: d.description,
                imageUrl: d.imageUrl,
                type: 'destination' as const,
            }));

        const spotResults: ResultItem[] = allSpots
            .filter(s =>
                (s.name || s.spotName || '').toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q) ||
                (s.location || s.address || '').toLowerCase().includes(q)
            )
            .slice(0, 5)
            .map(s => {
                const destId = s.destinationId;
                const destName = destinations.find(d => (d.id || d.destinationId) === destId)?.name;
                return {
                    id: s.id || s.spotId,
                    name: s.name || s.spotName,
                    description: s.description,
                    imageUrl: s.imageUrl,
                    type: 'spot' as const,
                    destinationName: destName,
                };
            });

        return [...destResults, ...spotResults];
    }, [query, destinations, allSpots]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (item: ResultItem) => {
        if (item.type === 'destination') {
            navigate(`/destinations/${item.id}`);
        } else {
            navigate(`/spots/${item.id}`);
        }
        setQuery('');
        setIsDropdownOpen(false);
    };

    const handleSearch = () => {
        if (!query.trim()) return;
        const params = new URLSearchParams();
        params.set('q', query);
        if (selectedDestId !== 'all') params.set('dest', selectedDestId);
        navigate(`/spots?${params.toString()}`);
        setIsDropdownOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
        if (e.key === 'Escape') { setIsDropdownOpen(false); inputRef.current?.blur(); }
    };

    // const selectedDestName = selectedDestId === 'all'
    //     ? 'Tất cả'
    //     : destinations.find(d => String(d.id || d.destinationId) === selectedDestId)?.name || 'Chọn tỉnh';

    const destResults = results.filter(r => r.type === 'destination');
    const spotResults = results.filter(r => r.type === 'spot');

    return (
        <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
            {/* ── SEARCH BAR ── */}
            <div className={`
                flex items-stretch bg-white rounded-2xl overflow-hidden transition-all duration-300
                ${isFocused
                    ? 'shadow-2xl shadow-blue-200/60 ring-2 ring-blue-400'
                    : 'shadow-xl shadow-slate-200/80 ring-1 ring-slate-200'}
            `}>
                {/* Filter button */}
                <div className="relative flex-shrink-0">


                    {/* Filter dropdown */}
                    {isFilterOpen && (
                        <div className="absolute left-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                            <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5">Lọc theo tỉnh/thành</p>
                                <button
                                    onClick={() => { setSelectedDestId('all'); setIsFilterOpen(false); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${selectedDestId === 'all' ? 'bg-blue-500 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    🗺️ Tất cả tỉnh/thành
                                </button>
                                {destinations.map(d => {
                                    const dId = String(d.id || d.destinationId);
                                    return (
                                        <button
                                            key={dId}
                                            onClick={() => { setSelectedDestId(dId); setIsFilterOpen(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedDestId === dId ? 'bg-blue-500 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            📍 {d.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setIsDropdownOpen(true); setIsFilterOpen(false); }}
                    onFocus={() => { setIsFocused(true); if (query) setIsDropdownOpen(true); }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tìm địa danh, tỉnh thành, thắng cảnh..."
                    className="flex-1 px-4 py-4 text-sm font-medium text-slate-700 placeholder-slate-400 bg-transparent focus:outline-none"
                />

                {/* Clear */}
                {query && (
                    <button
                        onClick={() => { setQuery(''); setIsDropdownOpen(false); inputRef.current?.focus(); }}
                        className="flex-shrink-0 px-2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Search button */}
                <button
                    onClick={handleSearch}
                    className="flex-shrink-0 m-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                >
                    <Search size={16} />
                    <span className="hidden sm:inline">Tìm</span>
                </button>
            </div>

            {/* ── RESULTS DROPDOWN ── */}
            {isDropdownOpen && query.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                    {results.length === 0 ? (
                        <div className="flex items-center gap-3 px-5 py-5 text-slate-400">
                            <Search size={16} className="text-slate-300" />
                            <span className="text-sm font-medium">Không tìm thấy kết quả cho "{query}"</span>
                        </div>
                    ) : (
                        <div className="py-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                            {/* Destinations group */}
                            {destResults.length > 0 && (
                                <div>
                                    <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Compass size={11} /> Tỉnh / Thành phố
                                    </p>
                                    {destResults.map(item => (
                                        <button
                                            key={`dest-${item.id}`}
                                            onMouseDown={() => handleSelect(item)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                                {getImageUrl(item.imageUrl || '') ? (
                                                    <img src={getImageUrl(item.imageUrl || '')!} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Compass size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors truncate">{item.name}</p>
                                                {item.description && (
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Tỉnh</span>
                                            <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Divider */}
                            {destResults.length > 0 && spotResults.length > 0 && (
                                <div className="mx-4 my-1 border-t border-slate-100" />
                            )}

                            {/* Spots group */}
                            {spotResults.length > 0 && (
                                <div>
                                    <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <MapPin size={11} /> Địa danh
                                    </p>
                                    {spotResults.map(item => (
                                        <button
                                            key={`spot-${item.id}`}
                                            onMouseDown={() => handleSelect(item)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                                {getImageUrl(item.imageUrl || '') ? (
                                                    <img src={getImageUrl(item.imageUrl || '')!} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <MapPin size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors truncate">{item.name}</p>
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {item.destinationName ? `📍 ${item.destinationName}` : item.description || ''}
                                                </p>
                                            </div>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex-shrink-0">Địa danh</span>
                                            <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Footer: go to full results */}
                            <div className="mx-3 mt-1 mb-2">
                                <button
                                    onMouseDown={handleSearch}
                                    className="w-full py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Search size={14} />
                                    Xem tất cả kết quả cho "{query}"
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Close filter on outside click */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
            )}
        </div>
    );
};

export default HomeSearch;