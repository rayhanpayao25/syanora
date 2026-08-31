import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Homepage, { Booking } from './homepage';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('hotel_bookings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse bookings", e);
      }
    }
    return [
      {
        id: 101,
        fullName: 'Lord Alexander Wright',
        email: 'alexander@domain.com',
        checkIn: '2026-09-10',
        checkOut: '2026-09-15',
        guests: '2',
        roomType: 'Deluxe River View Suite',
        status: 'Confirmed',
        createdAt: '2026-08-30'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('hotel_bookings', JSON.stringify(bookings));
  }, [bookings]);

  const handleDeleteBooking = (id: number) => {
    setBookings(prev => prev.filter(item => item.id !== id));
  };

  const handleAddBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const handleUpdateStatus = (id: number, status: 'Confirmed' | 'Pending' | 'Pending Payment' | 'Cancelled') => {
    setBookings(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <Homepage 
            bookings={bookings} 
            onAddBooking={handleAddBooking} 
          />
        } 
      />
      <Route 
        path="/admin" 
        element={
          <AdminDashboard 
            bookings={bookings}
            onUpdateStatus={handleUpdateStatus}
            onDeleteBooking={handleDeleteBooking}
            onBackToSite={() => navigate('/')} 
          />
        } 
      />
      <Route 
        path="*" 
        element={<div style={{ padding: '2rem', textAlign: 'center', color: '#fff' }}>404 - Page Not Found</div>} 
      />
    </Routes>
  );
}