import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import bgImage from './srcs/bg.jpg';
import ChatWidget from './components/ChatWidget';
import logoImage from './srcs/logo.png';
import { 
  Utensils, Waves, X, CheckCircle, Sparkles, Star, Phone,
  Compass, ShieldCheck, Heart, Coffee, AlertCircle, Download, Loader2, Lock
} from 'lucide-react';

export interface Booking {
  id: number;
  fullName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  roomType: string;
  paymentMethod: string;
  status: 'Confirmed' | 'Pending' | 'Pending Payment' | 'Cancelled';
  createdAt: string;
}

interface HomepageProps {
  bookings: Booking[];
  onAddBooking: (booking: Booking) => void;
}

interface RoomType {
  id: string;
  name: string;
  price: string;
  rawPrice: number;
  size: string;
  capacity: string;
  image: string;
  description: string;
}

const ROOM_TYPES: RoomType[] = [
  {
    id: 'deluxe',
    name: 'Deluxe River View Suite',
    price: '$240',
    rawPrice: 240,
    size: '55 m²',
    capacity: '2 Adults',
    image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
    description: 'Panoramic views of Prek Tuek Chhou with private balcony, king-size bed, and marble bath.'
  },
  {
    id: 'executive',
    name: 'Executive Residence Suite',
    price: '$450',
    rawPrice: 450,
    size: '95 m²',
    capacity: '3 Adults',
    image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
    description: 'Expansive lounge, floor-to-ceiling windows, complimentary executive lounge access, and private butler service.'
  },
  {
    id: 'presidential',
    name: 'Presidential Riverside Villa',
    price: '$890',
    rawPrice: 890,
    size: '180 m²',
    capacity: '4 Adults',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    description: 'Private infinity plunge pool, full kitchen, dedicated butler, and exclusive sunset deck.'
  }
];

const DINING_EXPERIENCES = [
  {
    name: 'Le Bokor Brasserie',
    cuisine: 'French-Khmer Fusion',
    description: 'Artisanal dining incorporating famous Kampot pepper and locally harvested seafood.',
    icon: Utensils
  },
  {
    name: 'Riverside Sunset Lounge',
    cuisine: 'Cocktails & Tapas',
    description: 'Handcrafted mixology paired with panoramic views of the Elephant Mountains.',
    icon: Coffee
  }
];

const AMENITIES = [
  {
    title: 'Prek Tuek Spa',
    desc: 'Traditional Khmer herbal therapies and holistic wellness treatments.',
    icon: Heart
  },
  {
    title: 'Infinity River Pool',
    desc: 'Chlorine-free saltwater pool overlooking the peaceful riverfront.',
    icon: Waves
  },
  {
    title: 'Heritage Excursions',
    desc: 'Guided tours to historical French colonial architecture and pepper plantations.',
    icon: Compass
  }
];

const Homepage: React.FC<HomepageProps> = ({ bookings, onAddBooking }) => {
  const navigate = useNavigate();
  const [isBookNowOpen, setIsBookNowOpen] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dateError, setDateError] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: '2',
    fullName: '',
    email: '',
    roomType: 'Deluxe River View Suite',
    paymentMethod: 'Pay at Resort'
  });

  const selectedBookNowRoom = ROOM_TYPES.find(r => r.name === formData.roomType) || ROOM_TYPES[0];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'checkIn' || name === 'checkOut') {
      setDateError('');
    }
  };

  const handleSelectRoomAndBook = (roomName: string) => {
    setFormData((prev) => ({ ...prev, roomType: roomName }));
    setIsBookNowOpen(true);
  };

  const sendEmailReceipt = async (bookingData: typeof formData, bookingId: number) => {
    setIsSendingEmail(true);
    setEmailStatus('idle');

    try {
      const serviceId = 'service_waogonc';
      const templateId = 'template_v81y2d4';
      const publicKey = 'k_ehO3YOtBWHeyWZx';

      const templateParams = {
        booking_id: `#${bookingId}`,
        to_name: bookingData.fullName,
        to_email: bookingData.email,
        room_type: bookingData.roomType,
        check_in: bookingData.checkIn,
        check_out: bookingData.checkOut,
        guests: bookingData.guests,
        payment_method: bookingData.paymentMethod,
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      setEmailStatus('success');
    } catch (error) {
      console.error('Error sending email via EmailJS:', error);
      setEmailStatus('error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDirectBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError('');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkInDate = new Date(formData.checkIn);
    checkInDate.setHours(0, 0, 0, 0);

    const checkOutDate = new Date(formData.checkOut);
    checkOutDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      setDateError('Check-in date cannot be in the past. Please select today or a future date.');
      return;
    }

    if (checkOutDate < checkInDate) {
      setDateError('Check-out date cannot be before the check-in date.');
      return;
    }
    
    const generatedId = Date.now();
    setCurrentBookingId(generatedId);

    const newBooking: Booking = {
      id: generatedId,
      fullName: formData.fullName,
      email: formData.email,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: formData.guests,
      roomType: formData.roomType,
      paymentMethod: formData.paymentMethod,
      status: 'Pending', 
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddBooking(newBooking);
    setBookingSubmitted(true);

    await sendEmailReceipt(formData, generatedId);
  };

  const resetAllModals = () => {
    setIsBookNowOpen(false);
    setBookingSubmitted(false);
    setEmailStatus('idle');
    setDateError('');
    setCurrentBookingId(null);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-800 relative w-full overflow-x-hidden">
      
      {/* Announcement Bar */}
      <div className="bg-slate-100 text-amber-700 text-xs py-2.5 px-4 text-center border-b border-slate-200 flex justify-between items-center max-w-full mx-auto w-full">
        <span className="flex items-center gap-2 mx-auto sm:mx-0 font-medium tracking-wide">
          <Sparkles size={14} className="text-amber-500 animate-pulse" /> Direct Booking Exclusive: Complimentary Airport Transfer
        </span>
        <span className="hidden md:flex items-center gap-4 text-slate-600 font-normal">
          <span className="flex items-center gap-1.5"><Phone size={12} className="text-amber-600" />+855 69 527 788</span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-600" /> Best Rate Guarantee</span>
        </span>
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-slate-200 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative p-0.5 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500">
              <img src={logoImage} alt="Logo" className="h-12 w-auto object-contain rounded-lg bg-white p-1" />
            </div>
            <div>
              <h1 className="text-2xl font-serif tracking-wider text-slate-900 font-bold leading-none">NEW KAMPOT</h1>
              <p className="text-[10px] text-amber-600 font-semibold tracking-[0.25em] uppercase mt-1">HOTEL & RESIDENCE</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-xs uppercase tracking-widest font-semibold text-slate-600 hover:text-amber-600 transition-colors">Home</button>
            <button onClick={() => scrollToSection('suites')} className="text-xs uppercase tracking-widest font-semibold text-slate-600 hover:text-amber-600 transition-colors">Suites</button>
            <button onClick={() => scrollToSection('dining')} className="text-xs uppercase tracking-widest font-semibold text-slate-600 hover:text-amber-600 transition-colors">Dining</button>
            <button onClick={() => scrollToSection('amenities')} className="text-xs uppercase tracking-widest font-semibold text-slate-600 hover:text-amber-600 transition-colors">Wellness</button>
            
            <button 
              onClick={() => setIsBookNowOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              Book Now
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 bg-slate-50 w-full">
        <div className="relative min-h-[550px] flex items-center justify-center overflow-hidden w-full">
          <div className="absolute inset-0">
            <img src={bgImage} alt="Background" className="w-full h-full object-cover filter brightness-95" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/20" />
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto py-20">
            <div className="inline-flex items-center gap-2 bg-white/90 px-5 py-2 rounded-full text-amber-700 text-xs tracking-widest uppercase font-bold mb-6">
              <Star size={14} className="fill-amber-500 text-amber-500" /> Five-Star Heritage Sanctuary
            </div>
            <h2 className="text-4xl sm:text-6xl font-serif text-white mb-6 leading-tight">
              Sanctuary of Refined Elegance
            </h2>
            <p className="text-lg text-slate-100 mb-10 max-w-2xl mx-auto font-light">
              Nestled on the serene banks of the Prek Tuek Chhou river. Experience colonial grandeur and French-Khmer fine dining.
            </p>
            <button 
              onClick={() => setIsBookNowOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm tracking-wider uppercase px-9 py-4 rounded-xl shadow-lg transition-all"
            >
              Book Now
            </button>
          </div>
        </div>

        {/* Suites Showcase */}
        <div id="suites" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-amber-600 text-xs uppercase tracking-[0.3em] font-bold">Accommodations</span>
            <h3 className="text-4xl font-serif text-slate-900 mt-2 mb-4">Suites & Private Villas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {ROOM_TYPES.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md flex flex-col">
                <div className="relative h-64">
                  <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-amber-700 text-sm font-serif">
                    {room.price} <span className="text-[10px] text-slate-500">/ night</span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xl font-serif text-slate-900 mb-2">{room.name}</h4>
                    <p className="text-slate-600 text-sm font-light mb-6">{room.description}</p>
                  </div>
                  <button 
                    onClick={() => handleSelectRoomAndBook(room.name)} 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Book This Suite
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dining Section */}
        <div id="dining" className="bg-slate-900 text-white py-20 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-amber-400 text-xs uppercase tracking-[0.3em] font-bold">Gastronomy</span>
              <h3 className="text-4xl font-serif mt-2 mb-4">Culinary Heritage</h3>
              <p className="text-slate-400 font-light text-sm">Indulge in seasonal flavours enhanced by local spices and fresh seafood from the Gulf of Thailand.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {DINING_EXPERIENCES.map((dining, idx) => {
                const IconComponent = dining.icon;
                return (
                  <div key={idx} className="bg-slate-800/60 p-8 rounded-2xl border border-slate-700/50 flex items-start gap-5">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                      <IconComponent size={28} />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">{dining.cuisine}</span>
                      <h4 className="text-2xl font-serif mt-1 mb-2 text-white">{dining.name}</h4>
                      <p className="text-slate-300 text-sm font-light leading-relaxed">{dining.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wellness & Amenities Section */}
        <div id="amenities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-amber-600 text-xs uppercase tracking-[0.3em] font-bold">Experiences</span>
            <h3 className="text-4xl font-serif text-slate-900 mt-2 mb-4">Wellness & Leisure</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {AMENITIES.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-full mb-5">
                    <IconComponent size={28} />
                  </div>
                  <h4 className="text-xl font-serif text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-slate-600 text-sm font-light leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 sm:py-12 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          <div className="space-y-1">
            <h5 className="text-white font-serif text-lg font-bold tracking-wider">NEW KAMPOT</h5>
            <p className="text-slate-400 font-light">Street 735, Riverside Promenade, Kampot, Cambodia</p>
            <p className="text-slate-500 text-[11px] sm:text-xs pt-1 md:hidden">
              +855 69 527 788 | info@newkampot.com
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t border-slate-800 md:border-t-0 w-full md:w-auto justify-center">
            <p className="text-slate-500 text-[11px] sm:text-xs">
              © {new Date().getFullYear()} New Kampot Hotel & Residence. All rights reserved.
            </p>

            <button 
              onClick={() => navigate('/admin')} 
              className="text-slate-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider font-medium px-3 py-1.5 rounded-lg border border-slate-800 hover:border-amber-500/50 bg-slate-800/40"
            >
              <Lock size={13} className="text-amber-500" /> Admin Portal
            </button>
          </div>

        </div>
      </footer>

      {/* DIRECT BOOK NOW MODAL (STRICT MOBILE CONTAINMENT FIX) */}
      {isBookNowOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="bg-white text-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg p-4 sm:p-8 shadow-2xl relative my-auto max-h-[88vh] flex flex-col border border-slate-100 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0 w-full">
              <h3 className="text-lg sm:text-2xl font-serif text-slate-900 truncate pr-2">
                {!bookingSubmitted ? 'Reserve Your Stay' : 'Reservation Confirmed!'}
              </h3>
              <button 
                onClick={resetAllModals} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content Wrapper */}
            <div className="overflow-y-auto overflow-x-hidden pr-1 space-y-4 flex-1 w-full">
              {!bookingSubmitted ? (
                <form onSubmit={handleDirectBookSubmit} className="space-y-3.5 w-full">
                  {dateError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0 text-rose-500" />
                      <span>{dateError}</span>
                    </div>
                  )}

                  <div className="relative h-28 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden mb-3 border border-slate-200 shadow-inner w-full">
                    <img src={selectedBookNowRoom.image} alt={selectedBookNowRoom.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-3 sm:p-4">
                      <div className="text-white min-w-0">
                        <p className="text-[10px] sm:text-xs uppercase font-bold text-amber-400 tracking-wider">{selectedBookNowRoom.price} / night</p>
                        <h4 className="font-serif text-xs sm:text-sm font-semibold truncate">{selectedBookNowRoom.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Accommodation Type</label>
                    <select 
                      name="roomType" 
                      value={formData.roomType} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500 font-medium truncate"
                    >
                      {ROOM_TYPES.map(room => (
                        <option key={room.id} value={room.name}>{room.name} ({room.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Guest Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      required 
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      required 
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* CHECK-IN & CHECK-OUT ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <div className="min-w-0">
                      <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Check-in</label>
                      <input 
                        type="date" 
                        name="checkIn" 
                        required 
                        min={todayStr}
                        value={formData.checkIn} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500" 
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Check-out</label>
                      <input 
                        type="date" 
                        name="checkOut" 
                        required 
                        min={formData.checkIn || todayStr}
                        value={formData.checkOut} 
                        onChange={handleInputChange} 
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500" 
                      />
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Number of Guests</label>
                    <select 
                      name="guests" 
                      value={formData.guests} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                    </select>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 uppercase mb-1">Mode of Payment</label>
                    <select 
                      name="paymentMethod" 
                      value={formData.paymentMethod} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm focus:outline-none focus:border-amber-500 font-medium truncate"
                    >
                      <option value="Pay at Resort">Pay at Resort (Cash / Card)</option>
                      <option value="Credit Card">Credit / Debit Card</option>
                      <option value="ABA PayWay">ABA PayWay (QR / KHQR)</option>
                      <option value="Bank Transfer">Direct Bank Transfer</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase py-3.5 rounded-xl shadow-md mt-3 transition-all">
                    Confirm Reservation & Send E-Receipt
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 space-y-3 w-full">
                  <CheckCircle size={48} className="text-emerald-500 mx-auto animate-bounce" />
                  
                  {currentBookingId && (
                    <div className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl font-mono text-[11px] text-slate-700">
                      Booking Reference: <strong className="text-amber-600">#{currentBookingId}</strong>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs space-y-2 text-slate-700 w-full">
                    {isSendingEmail ? (
                      <p className="flex items-center gap-2 text-slate-600">
                        <Loader2 size={14} className="animate-spin text-amber-600 shrink-0" /> 
                        <span>Sending e-receipt...</span>
                      </p>
                    ) : emailStatus === 'success' ? (
                      <p className="text-emerald-700 font-medium">
                        ✓ E-receipt successfully sent to <strong className="text-slate-900">{formData.email}</strong>.
                      </p>
                    ) : (
                      <p className="text-rose-600 leading-relaxed font-medium">
                        There was an issue sending the email via EmailJS. You can download the receipt directly below.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col gap-2 w-full">
                    <button 
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>Booking Receipt #${currentBookingId}</title>
                                <style>
                                  body { font-family: sans-serif; padding: 20px; color: #334155; }
                                  .card { max-width: 500px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; }
                                  h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
                                  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                                  .label { color: #64748b; }
                                  .value { font-weight: 600; color: #0f172a; }
                                </style>
                              </head>
                              <body>
                                <div class="card">
                                  <h1>New Kampot Hotel & Residence</h1>
                                  <p style="color: #d97706; font-weight: bold;">Confirmed Reservation</p>
                                  <div class="row"><span class="label">Booking ID</span><span class="value">#${currentBookingId}</span></div>
                                  <div class="row"><span class="label">Guest Name</span><span class="value">${formData.fullName}</span></div>
                                  <div class="row"><span class="label">Email Address</span><span class="value">${formData.email}</span></div>
                                  <div class="row"><span class="label">Room Suite</span><span class="value">${formData.roomType}</span></div>
                                  <div class="row"><span class="label">Check-in Date</span><span class="value">${formData.checkIn}</span></div>
                                  <div class="row"><span class="label">Check-out Date</span><span class="value">${formData.checkOut}</span></div>
                                  <div class="row"><span class="label">Guests</span><span class="value">${formData.guests}</span></div>
                                  <div class="row"><span class="label">Payment Method</span><span class="value">${formData.paymentMethod}</span></div>
                                </div>
                                <script>window.onload = function() { window.print(); };</script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-3 rounded-xl text-xs uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={16} /> Download E-Receipt Directly
                    </button>
                    <button onClick={resetAllModals} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-3 rounded-xl text-xs uppercase transition-all">
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <ChatWidget />
    </div>
  );
};

export default Homepage;