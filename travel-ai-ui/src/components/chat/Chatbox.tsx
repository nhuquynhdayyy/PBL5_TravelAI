import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Map, Hotel, CalendarCheck } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const Chatbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { text: "Xin chào! Tôi là trợ lý TravelAI. Bạn muốn đi đâu?", sender: 'ai', type: 'text' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { text: input, sender: 'user', type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await axiosClient.post('/chat', { message: input });
      setMessages(prev => [...prev, { ...data, sender: 'ai' }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Xin lỗi, tôi đang bận tí!", sender: 'ai', type: 'text' }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* Nút tròn Floating */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-all text-white animate-bounce"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="bg-white w-[380px] h-[550px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-lg"><Bot size={20} /></div>
              <span className="font-bold">Travel AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg"><X size={20}/></button>
          </div>

          {/* Nội dung tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white shadow-sm border border-slate-100 rounded-tl-none text-slate-700'
                }`}>
                  <p>{msg.text}</p>
                  
                  {/* RENDER THEO LOẠI (TYPE) */}
                  {msg.type === 'itinerary' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-[11px] font-black text-blue-400 uppercase mb-2">AI Itinerary Ready</p>
                      <h4 className="font-bold text-slate-800 mb-3">{msg.data?.tripTitle}</h4>
                      
                      <button 
                        onClick={() => navigate('/itinerary/latest', { state: { data: msg.data } })}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                      >
                        <Map size={14}/> MỞ TIMELINE CHI TIẾT
                      </button>
                    </div>
                  )}

                  {msg.type === 'hotel' && (
                    <div className="mt-3 space-y-2">
                      {msg.data.map((h: any) => (
                        <div key={h.id} className="flex gap-2 p-2 bg-slate-50 rounded-xl border">
                          <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0"></div>
                          <div className="text-[11px]">
                            <p className="font-bold">{h.name}</p>
                            <p className="text-blue-500">{h.price.toLocaleString()}₫</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.type === 'booking' && (
                    <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 text-green-700 text-xs">
                       <CalendarCheck size={20} className="mb-2" />
                       Hệ thống đã sẵn sàng. Bạn muốn đặt vào ngày nào?
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-[10px] text-slate-400 italic">AI đang trả lời...</div>}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t flex gap-2">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Bạn muốn đi đâu?"
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-xl"><Send size={20}/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbox;