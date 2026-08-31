// src/utils/localKnowledgeBase.ts

export const checkLocalKnowledgeBase = (text: string): string | null => {
  const lowerText = text.toLowerCase().trim();

  // Helper
  const hasAny = (...keywords: string[]) =>
    keywords.some((keyword) => lowerText.includes(keyword));

  // 1. CHECK-IN
  if (
    hasAny(
      'checkin',
      'check-in',
      'check in',
      'arrival time',
      'arrive',
      'what time can i check in'
    )
  ) {
    return (
      'Our standard check-in time is 2:00 PM. ' +
      'Early check-in is subject to room availability. ' +
      'Our front desk is available 24/7.'
    );
  }

  // 2. CHECK-OUT
  if (
    hasAny(
      'checkout',
      'check-out',
      'check out',
      'departure time',
      'what time do i leave'
    )
  ) {
    return (
      'Our standard check-out time is 12:00 PM (Noon). ' +
      'Late check-out is subject to availability and hotel policy.'
    );
  }

  // 3. EARLY CHECK-IN
  if (
    hasAny(
      'early check in',
      'early check-in',
      'early checkin',
      'check in early'
    )
  ) {
    return (
      'Early check-in may be available depending on room availability. ' +
      'Please contact our front desk at +855 69 527 788 to confirm.'
    );
  }

  // 4. LATE CHECK-OUT
  if (
    hasAny(
      'late check out',
      'late check-out',
      'late checkout',
      'check out late'
    )
  ) {
    return (
      'Late check-out is subject to room availability and hotel policy. ' +
      'Please contact our front desk at +855 69 527 788 for confirmation.'
    );
  }

  // 5. WIFI & INTERNET
  if (
    hasAny(
      'wifi',
      'wi-fi',
      'internet',
      'wireless',
      'internet connection'
    )
  ) {
    return 'We provide free high-speed Wi-Fi across all guest rooms and public areas.';
  }

  // 6. LOCATION / ADDRESS
  if (
    hasAny(
      'location',
      'address',
      'where is',
      'where are you',
      'hotel location',
      'where is the hotel'
    )
  ) {
    return 'New Kampot Hotel & Residence is located at National Road 33, Kampot, Cambodia.';
  }

  // 7. CONTACT DETAILS
  if (
    hasAny(
      'contact',
      'phone number',
      'phone',
      'telephone',
      'call',
      'email',
      'how can i contact',
      'contact hotel'
    )
  ) {
    return (
      'You can contact New Kampot Hotel & Residence by phone at ' +
      '+855 69 527 788 or by email at info@newkampothotel.com.'
    );
  }

  // 8. WEBSITE
  if (
    hasAny(
      'website',
      'web site',
      'official website',
      'hotel website',
      'book online',
      'online booking'
    )
  ) {
    return (
      'You can visit our official website at https://newkampothotel.com for ' +
      'more information and direct online booking.'
    );
  }

  // 9. FACEBOOK
  if (
    hasAny(
      'facebook',
      'fb page',
      'facebook page',
      'social media'
    )
  ) {
    return (
      'You can contact or message us through our Facebook page: ' +
      'https://www.facebook.com/newkampothotel'
    );
  }

  // 10. PAYMENT METHODS
  if (
    hasAny(
      'payment',
      'pay',
      'paying',
      'payment method',
      'payment methods',
      'aba',
      'aba bank',
      'wing',
      'wing payment'
    )
  ) {
    return (
      'We accept payments through ABA Bank and Wing. ' +
      'Please confirm the payment instructions with the hotel before making a transfer.'
    );
  }

  // 11. REFUND / CANCELLATION
  if (
    hasAny(
      'refund',
      'refunded',
      'refund money',
      'money back',
      'get my money back',
      'cancellation',
      'cancel my booking',
      'cancel my reservation',
      'cancel reservation',
      'cancel booking',
      'cancel a booking',
      'cancellation policy'
    )
  ) {
    return (
      'Refund requests depend on the cancellation and booking conditions of your reservation. ' +
      'Non-refundable bookings may not be eligible for a refund. ' +
      'For a refund request or to confirm your eligibility, please contact our hotel team directly at ' +
      '+855 69 527 788 or info@newkampothotel.com.'
    );
  }

  // 12. GENERAL RESERVATION / BOOKING
  if (
    hasAny(
      'reservation',
      'reservations',
      'booking',
      'book a room',
      'book room',
      'reserve a room',
      'reserve room',
      'make a booking',
      'make reservation',
      'can i book',
      'can i reserve',
      'want to book',
      'i want a room'
    )
  ) {
    return (
      'You can make a reservation through our official website at ' +
      'https://newkampothotel.com, contact us through Facebook at ' +
      'https://www.facebook.com/newkampothotel, or call +855 69 527 788.'
    );
  }

  // 13. ROOM AVAILABILITY
  if (
    hasAny(
      'availability',
      'available room',
      'rooms available',
      'room available',
      'any room available',
      'is there a room',
      'do you have a room',
      'vacancy',
      'vacant room'
    )
  ) {
    return (
      'Room availability depends on your requested dates. ' +
      'For the latest availability and confirmed booking, please visit ' +
      'https://newkampothotel.com or contact us at +855 69 527 788.'
    );
  }

  // 14. DELUXE DOUBLE ROOM
  if (
    hasAny(
      'deluxe double',
      'deluxe double room',
      'double room',
      'king room',
      'room with king bed',
      'one king bed'
    )
  ) {
    return (
      'Our Deluxe Double Room features 1 King Bed and accommodates up to 2 adults. ' +
      'The weekday rate is $45 per night and the weekend rate is $55 per night.'
    );
  }

  // 15. DELUXE TWIN ROOM
  if (
    hasAny(
      'deluxe twin',
      'deluxe twin room',
      'twin room',
      'two single beds',
      '2 single beds',
      'two beds'
    )
  ) {
    return (
      'Our Deluxe Twin Room features 2 Single Beds and accommodates up to 2 adults. ' +
      'The weekday rate is $50 per night and the weekend rate is $60 per night.'
    );
  }

  // 16. EXECUTIVE RESIDENCE SUITE
  if (
    hasAny(
      'executive suite',
      'executive residence',
      'executive residence suite',
      'executive room',
      'super king',
      'living area suite'
    )
  ) {
    return (
      'Our Executive Residence Suite features 1 Super King Bed and a separate living area. ' +
      'It accommodates up to 2 adults and 1 child. ' +
      'The weekday rate is $85 per night and the weekend rate is $100 per night.'
    );
  }

  // 17. FAMILY RESIDENCE SUITE
  if (
    hasAny(
      'family suite',
      'family residence',
      'family residence suite',
      'family room',
      'room for family',
      '2 bedrooms',
      'two bedrooms'
    )
  ) {
    return (
      'Our Family Residence Suite features 2 King Beds across 2 bedrooms and ' +
      'accommodates up to 4 adults. ' +
      'The weekday rate is $120 per night and the weekend rate is $140 per night.'
    );
  }

  // 18. ROOM PRICES
  if (
    hasAny(
      'room price',
      'room prices',
      'room rate',
      'room rates',
      'how much is a room',
      'how much per night',
      'price per night',
      'hotel price',
      'hotel rates',
      'how much does it cost'
    )
  ) {
    return (
      'Our reference room rates are:\n\n' +
      '• Deluxe Double Room: $45 weekday / $55 weekend\n' +
      '• Deluxe Twin Room: $50 weekday / $60 weekend\n' +
      '• Executive Residence Suite: $85 weekday / $100 weekend\n' +
      '• Family Residence Suite: $120 weekday / $140 weekend'
    );
  }

  // 19. AMENITIES / FACILITIES
  if (
    hasAny(
      'amenities',
      'facilities',
      'hotel facilities',
      'what does the hotel have',
      'what facilities',
      'pool',
      'gym',
      'fitness',
      'restaurant'
    )
  ) {
    return (
      'Our main on-site amenities include:\n\n' +
      '• Outdoor Swimming Pool\n' +
      '• Fitness Center\n' +
      '• Rooftop Restaurant & Bar\n' +
      '• Free High-Speed Wi-Fi\n' +
      '• Daily Housekeeping\n' +
      '• 24/7 Security & Front Desk'
    );
  }

  // 20. DEFAULT
  return null;
};