import React, { useState } from 'react';
import { Booking } from '../homepage';
import { 
  ArrowLeft, Trash2, Mail, BedDouble, MessageSquare, Send, X, 
  Search, BarChart3, Calendar, Filter, CreditCard, Home, Hash, AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  onUpdateStatus: (id: number, status: 'Confirmed' | 'Pending' | 'Pending Payment' | 'Cancelled') => void;
  onDeleteBooking: (id: number) => void;
  onBackToSite: () => void;
}

interface Message {
  id: number;
  sender: 'admin' | 'guest' | 'system';
  text: string;
  timestamp: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  bookings, 
  onUpdateStatus, 
  onDeleteBooking, 
  onBackToSite 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reservations' | 'analytics'>('reservations');
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<number, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const openChatForBooking = (booking: Booking) => {
    setActiveChatBooking(booking);
    if (!chatHistories[booking.id]) {
      const initialMessages: Message[] = [
        {
          id: 1,
          sender: 'system',
          text: `Secure concierge channel initialized for ${booking.fullName} [ID: #${booking.id}] — Suite: ${booking.roomType}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 2,
          sender: 'guest',
          text: `Hello! I submitted a booking request for ${booking.roomType} (${booking.checkIn} to ${booking.checkOut}). Payment method: ${booking.paymentMethod}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setChatHistories(prev => ({ ...prev, [booking.id]: initialMessages }));
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatBooking) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: 'admin',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistories(prev => ({
      ...prev,
      [activeChatBooking.id]: [...(prev[activeChatBooking.id] || []), newMessage]
    }));
    setInputText('');
  };

  const handleStatusChangeFromChat = (newStatus: 'Confirmed' | 'Pending' | 'Pending Payment' | 'Cancelled') => {
    if (!activeChatBooking) return;
    onUpdateStatus(activeChatBooking.id, newStatus);

    const statusEmoji = newStatus === 'Confirmed' ? '✅' : newStatus === 'Cancelled' ? '🚫' : '⏳';
    const systemMsg: Message = {
      id: Date.now(),
      sender: 'system',
      text: `${statusEmoji} Reservation #${activeChatBooking.id} status updated to ${newStatus} by Front Desk Admin.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistories(prev => ({
      ...prev,
      [activeChatBooking.id]: [...(prev[activeChatBooking.id] || []), systemMsg]
    }));
    setActiveChatBooking(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(b => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'Pending' || b.status === 'Pending Payment').length;
  const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;
  const occupancyRate = totalBookings > 0 ? Math.round((confirmedCount / totalBookings) * 100) : 0;

  const filteredBookings = bookings.filter(item => {
    const matchesSearch = 
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex selection:bg-amber-500 selection:text-slate-950">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden lg:flex">
        <div className="p-6 space-y-8">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">PMS SYSTEM</span>
            <h2 className="font-serif text-lg font-bold text-white tracking-wide">New Kampot Admin</h2>
          </div>
          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('reservations')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all ${activeTab === 'reservations' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
            >
              <Calendar size={16} /> Reservation Ledger
            </button>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
            >
              <Home size={16} /> Operations Overview
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all ${activeTab === 'analytics' ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
            >
              <BarChart3 size={16} /> Revenue & Reports
            </button>
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={onBackToSite}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700/60"
          >
            <ArrowLeft size={14} /> Exit to Guest Portal
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-20 bg-slate-900/80 border-b border-slate-800 px-6 md:px-10 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <button onClick={onBackToSite} className="text-amber-400 hover:text-amber-300">
                <ArrowLeft size={20} />
              </button>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-white tracking-wide">
                {activeTab === 'reservations' && 'Reservation Management Ledger'}
                {activeTab === 'overview' && 'Property Operations Overview'}
                {activeTab === 'analytics' && 'Financial Performance & Analytics'}
              </h1>
              <p className="text-xs text-slate-400">Manage bookings, monitor live guest inquiries, and track revenue.</p>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 space-y-8 max-w-7xl w-full mx-auto">
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Bookings</span>
                  <p className="text-2xl font-bold text-white mt-1">{totalBookings}</p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Confirmed</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{confirmedCount}</p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Pending / Unpaid</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">Cancelled</span>
                  <p className="text-2xl font-bold text-rose-400 mt-1">{cancelledCount}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by ID, name, email, or suite..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Filter size={14} className="text-amber-400" /> Filter:
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                  <h2 className="font-serif font-semibold text-sm text-white">Active Guest Directory ({filteredBookings.length})</h2>
                  <span className="text-[11px] font-mono text-slate-500">PMS_VER: 2.6.4</span>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 space-y-2">
                    <AlertCircle size={32} className="mx-auto text-slate-600 stroke-1" />
                    <p className="text-sm font-medium text-slate-400">No reservations found matching your query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-widest bg-slate-950 font-semibold">
                          <th className="p-4">Booking ID</th>
                          <th className="p-4">Guest Info</th>
                          <th className="p-4">Reserved Suite</th>
                          <th className="p-4">Payment</th>
                          <th className="p-4">Schedule</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredBookings.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                <Hash size={12} /> {item.id}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20">
                                  {item.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-xs">{item.fullName}</p>
                                  <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                    <Mail size={11} className="text-slate-500" /> {item.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-medium text-slate-200 text-xs flex items-center gap-2">
                                <BedDouble size={15} className="text-amber-500" />
                                {item.roomType}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-300">
                                <CreditCard size={12} className="text-amber-400" />
                                {item.paymentMethod || 'Pay at Resort'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                                <p><strong className="text-slate-300">In:</strong> {item.checkIn || 'N/A'}</p>
                                <p><strong className="text-slate-300">Out:</strong> {item.checkOut || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <select
                                value={item.status}
                                onChange={(e) => onUpdateStatus(item.id, e.target.value as any)}
                                className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer transition-all ${
                                  item.status === 'Confirmed'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : item.status === 'Cancelled'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                <option value="Confirmed" className="bg-slate-900 text-emerald-400">Confirmed</option>
                                <option value="Pending" className="bg-slate-900 text-amber-400">Pending</option>
                                <option value="Pending Payment" className="bg-slate-900 text-amber-400">Pending Payment</option>
                                <option value="Cancelled" className="bg-slate-900 text-rose-400">Cancelled</option>
                              </select>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => openChatForBooking(item)}
                                  className="flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                  title="Open Concierge Channel"
                                >
                                  <MessageSquare size={13} /> Concierge
                                </button>
                                <button 
                                  onClick={() => onDeleteBooking(item.id)}
                                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors border border-rose-500/20"
                                  title="Delete Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Home size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-white text-base">Property Occupancy</h3>
                  <p className="text-xs text-slate-400 mt-1">Current estimated occupancy status based on confirmed check-ins.</p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Occupancy Rate:</span>
                  <span className="text-xl font-bold text-amber-400 font-mono">{occupancyRate}%</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-white text-base">Pending & Unpaid</h3>
                  <p className="text-xs text-slate-400 mt-1">Reservations currently awaiting verification or payment.</p>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pending Count:</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{pendingCount} requests</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-white text-base">Live Concierge</h3>
                  <p className="text-xs text-slate-400 mt-1">Communicate directly with guests from the reservation ledger.</p>
                </div>
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setActiveTab('reservations')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl transition-colors"
                  >
                    Open Active Chats
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="font-serif font-bold text-white text-base">Booking Status Distribution</h3>
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Confirmed Bookings</span>
                      <span className="text-emerald-400 font-mono">{confirmedCount}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${totalBookings ? (confirmedCount/totalBookings)*100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Pending / Unpaid Review</span>
                      <span className="text-amber-400 font-mono">{pendingCount}</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${totalBookings ? (pendingCount/totalBookings)*100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-white text-base">Resort Revenue Summary</h3>
                  <p className="text-xs text-slate-400 mt-1">Estimated gross turnover based on confirmed room bookings.</p>
                </div>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Confirmed Pipeline Value</span>
                  <p className="text-3xl font-serif font-bold text-amber-400 mt-1">${confirmedCount * 180}.00 <span className="text-xs font-sans text-slate-500 font-normal">USD (Est.)</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {activeChatBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden h-[620px]">
            <div className="p-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-serif text-sm border border-amber-500/30">
                  {activeChatBooking.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-white text-sm">{activeChatBooking.fullName}</h3>
                    <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      #{activeChatBooking.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{activeChatBooking.roomType} • <span className="text-amber-400">{activeChatBooking.paymentMethod}</span></p>
                </div>
              </div>
              <button onClick={() => setActiveChatBooking(null)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950/60 border-b border-slate-800 p-3 px-5 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                Status: <strong className="text-white uppercase font-mono tracking-wider bg-slate-800 px-2 py-0.5 rounded text-[11px]">{activeChatBooking.status}</strong>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button onClick={() => handleStatusChangeFromChat('Confirmed')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all shadow-sm">Confirm</button>
                <button onClick={() => handleStatusChangeFromChat('Pending')} className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all shadow-sm">Pending</button>
                <button onClick={() => handleStatusChangeFromChat('Pending Payment')} className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all shadow-sm">Unpaid</button>
                <button onClick={() => handleStatusChangeFromChat('Cancelled')} className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all shadow-sm">Cancel</button>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-900/40 text-xs">
              {(chatHistories[activeChatBooking.id] || []).map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="text-center my-3">
                      <span className="bg-slate-950 text-slate-400 border border-slate-800 px-3.5 py-1.5 rounded-xl text-[10px] inline-block font-mono shadow-inner">
                        {msg.text}
                      </span>
                    </div>
                  );
                }
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-2xl ${isAdmin ? 'bg-amber-500 text-slate-950 rounded-br-none font-medium shadow-md' : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-none shadow-sm'}`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className={`text-[9px] block text-right mt-1.5 font-mono ${isAdmin ? 'text-slate-800' : 'text-slate-500'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendMessage} className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Type official message to guest..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
              />
              <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-3 rounded-xl transition-all shadow-md">
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;