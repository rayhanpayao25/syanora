import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';

import Homepage, { Booking } from './homepage';
import AdminDashboard from './components/AdminDashboard';

const MainApp: React.FC = () => {
  const navigate = useNavigate();

  // Shared state for bookings
  // Bookings are saved in LocalStorage
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('hotel_bookings');

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse bookings from LocalStorage:', error);
      }
    }

    // Default booking if there is no saved data
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
        createdAt: '2026-08-30',
      },
    ];
  });

  // Save bookings whenever they change
  useEffect(() => {
    localStorage.setItem('hotel_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Delete a booking
  const handleDeleteBooking = (id: number) => {
    setBookings((prev) =>
      prev.filter((booking) => booking.id !== id)
    );
  };

  // Add a new booking
  const handleAddBooking = (newBooking: Booking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  // Update booking status
  const handleUpdateStatus = (
    id: number,
    status: 'Confirmed' | 'Pending' | 'Pending Payment' | 'Cancelled'
  ) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id
          ? {
              ...booking,
              status,
            }
          : booking
      )
    );
  };

  return (
    <Routes>
      {/* =========================
          HOMEPAGE
      ========================== */}
      <Route
        path="/"
        element={
          <Homepage
            bookings={bookings}
            onAddBooking={handleAddBooking}
          />
        }
      />

      {/* =========================
          ADMIN DASHBOARD
      ========================== */}
      <Route
        path="/admin"
        element={
          <AdminDashboard
            bookings={bookings}
            onDeleteBooking={handleDeleteBooking}
            onUpdateStatus={handleUpdateStatus}
            onBackToSite={() => navigate('/')}
          />
        }
      />

      {/* =========================
          404 PAGE
      ========================== */}
      <Route
        path="*"
        element={
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            404 - Page Not Found
          </div>
        }
      />
    </Routes>
  );
};

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <Router>
        <MainApp />
      </Router>
    </React.StrictMode>
  );
}
