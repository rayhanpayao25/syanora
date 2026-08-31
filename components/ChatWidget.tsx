

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import {
  MessageSquare,
  X,
  Send,
  Hotel,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

import { ChatMessage } from '../types';
import {
  sendMessageStream,
  resetChatSession,
  getChatSession,
} from '../services/groqService';

import MessageBubble from './MessageBubble';

type FlowStep =
  | 'PRIVACY'
  | 'READY'
  | 'ASKING_NAME'
  | 'CHATTING';

const STORAGE_KEY_MESSAGES = 'kampot_chat_messages';
const STORAGE_KEY_STEP = 'kampot_chat_step';
const STORAGE_KEY_NAME = 'kampot_chat_name';
const STORAGE_KEY_PENDING_Q = 'kampot_chat_pending_q';

/* =========================================================
   FACEBOOK / STAFF RESPONSE
   ========================================================= */

const FACEBOOK_AGENT_MESSAGE =
  'Yes, of course! 😊 You can talk to our staff by visiting our Facebook Page: https://www.facebook.com/newkampothotel\n\nOur team will be happy to assist you there.';

/* =========================================================
   HELPERS
   ========================================================= */

const generateUniqueId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/* =========================================================
   PRIVACY MESSAGE
   ========================================================= */

const PRIVACY_MESSAGE: ChatMessage = {
  id: 'privacy-1',
  text:
    'Welcome to New Kampot Hotel & Residence Concierge Support.\n\n' +
    'To assist you with reservations and inquiries, please acknowledge our ' +
    'Data Privacy Policy: https://newkampothotel.com/privacy-policy.\n\n' +
    'If you agree, kindly click the I Agree button below.',
  sender: 'bot',
  timestamp: new Date(),
};


const checkLocalKnowledgeBase = (text: string): string | null => {
  const lowerText = text.toLowerCase().trim();

  // =========================================================
  // HELPER
  // =========================================================

  const hasAny = (...keywords: string[]) =>
    keywords.some((keyword) => lowerText.includes(keyword));

  // =========================================================
  // 1. CHECK-IN
  // =========================================================

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

  // =========================================================
  // 2. CHECK-OUT
  // =========================================================

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

  // =========================================================
  // 3. EARLY CHECK-IN
  // =========================================================

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

  // =========================================================
  // 4. LATE CHECK-OUT
  // =========================================================

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

  // =========================================================
  // 5. WIFI & INTERNET
  // =========================================================

  if (
    hasAny(
      'wifi',
      'wi-fi',
      'internet',
      'wireless',
      'internet connection'
    )
  ) {
    return (
      'We provide free high-speed Wi-Fi across all guest rooms and public areas.'
    );
  }

  // =========================================================
  // 6. LOCATION / ADDRESS
  // =========================================================

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
    return (
      'New Kampot Hotel & Residence is located at National Road 33, Kampot, Cambodia.'
    );
  }

  // =========================================================
  // 7. CONTACT DETAILS
  // =========================================================

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

  // =========================================================
  // 8. WEBSITE
  // =========================================================

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

  // =========================================================
  // 9. FACEBOOK
  // =========================================================

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

  // =========================================================
  // 10. PAYMENT METHODS
  // =========================================================

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

  // =========================================================
  // 11. REFUND / CANCELLATION
  // =========================================================

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
      '+855 69 527 788 or info@newkampothotel.com. ' +
      'Approved refunds will normally be processed through the original payment method, ' +
      'and processing time may vary depending on the payment provider or bank.'
    );
  }

  // =========================================================
  // 12. GENERAL RESERVATION / BOOKING
  // =========================================================

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
      'https://www.facebook.com/newkampothotel, or call +855 69 527 788. ' +
      'For a confirmed reservation, please provide your check-in date, check-out date, ' +
      'number of guests, and preferred room type.'
    );
  }

  // =========================================================
  // 13. ROOM AVAILABILITY
  // =========================================================
  // IMPORTANT:
  // These are SAMPLE/MOCK values only.
  // Do not present them as real-time inventory.

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

  // =========================================================
  // 14. DELUXE DOUBLE ROOM
  // =========================================================

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
      'The weekday rate is $45 per night and the weekend rate is $55 per night. ' +
      'It includes city views, a private balcony, air conditioning, smart TV, ' +
      'and an en-suite bathroom.'
    );
  }

  // =========================================================
  // 15. DELUXE TWIN ROOM
  // =========================================================

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
      'The weekday rate is $50 per night and the weekend rate is $60 per night. ' +
      'It features contemporary decor, high-speed Wi-Fi, and premium toiletries.'
    );
  }

  // =========================================================
  // 16. EXECUTIVE RESIDENCE SUITE
  // =========================================================

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
      'The weekday rate is $85 per night and the weekend rate is $100 per night. ' +
      'The suite includes a kitchenette, panoramic river and mountain views, and a soaking bathtub.'
    );
  }

  // =========================================================
  // 17. FAMILY RESIDENCE SUITE
  // =========================================================

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
      'The weekday rate is $120 per night and the weekend rate is $140 per night. ' +
      'It includes a full kitchen and dining space and is designed for families or small groups.'
    );
  }

  // =========================================================
  // 18. ROOM PRICES
  // =========================================================

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
      '• Family Residence Suite: $120 weekday / $140 weekend\n\n' +
      'Rates may be subject to change. Please confirm the final rate for your dates with the hotel.'
    );
  }

  // =========================================================
  // 19. ROOM TYPES
  // =========================================================

  if (
    hasAny(
      'room types',
      'types of rooms',
      'what rooms do you have',
      'what room types',
      'available room types'
    )
  ) {
    return (
      'We offer four main room types:\n\n' +
      '• Deluxe Double Room — 1 King Bed, up to 2 adults\n' +
      '• Deluxe Twin Room — 2 Single Beds, up to 2 adults\n' +
      '• Executive Residence Suite — 1 Super King Bed + living area, up to 2 adults and 1 child\n' +
      '• Family Residence Suite — 2 King Beds across 2 bedrooms, up to 4 adults'
    );
  }

  // =========================================================
  // 20. BEST ROOM FOR COUPLES
  // =========================================================

  if (
    hasAny(
      'room for couple',
      'room for couples',
      'best room for couple',
      'best room for couples',
      'couples room'
    )
  ) {
    return (
      'For couples, our Deluxe Double Room is a great option. ' +
      'It features 1 King Bed, a private balcony, city views, air conditioning, ' +
      'a smart TV, and an en-suite bathroom.'
    );
  }

  // =========================================================
  // 21. BEST ROOM FOR FRIENDS
  // =========================================================

  if (
    hasAny(
      'room for friends',
      'friends room',
      'room for two friends',
      'room with separate beds'
    )
  ) {
    return (
      'For friends or travelers who prefer separate beds, the Deluxe Twin Room ' +
      'features 2 Single Beds and accommodates up to 2 adults.'
    );
  }

  // =========================================================
  // 22. BEST ROOM FOR FAMILY
  // =========================================================

  if (
    hasAny(
      'best room for family',
      'room for family',
      'family accommodation',
      'family accommodation room',
      'room for 4',
      'four adults'
    )
  ) {
    return (
      'For families or small groups, the Family Residence Suite is the most suitable listed option. ' +
      'It has 2 bedrooms with 2 King Beds, a full kitchen, dining space, and accommodates up to 4 adults.'
    );
  }

  // =========================================================
  // 23. SWIMMING POOL
  // =========================================================

  if (
    hasAny(
      'pool',
      'swimming pool',
      'swim',
      'swimming',
      'outdoor pool'
    )
  ) {
    return (
      'Yes, we have an outdoor swimming pool available for our hotel guests. ' +
      'Guests should follow the posted pool safety rules.'
    );
  }

  // =========================================================
  // 24. GYM / FITNESS
  // =========================================================

  if (
    hasAny(
      'gym',
      'fitness',
      'fitness center',
      'workout',
      'exercise'
    )
  ) {
    return (
      'Yes, we have a fitness center available on-site for hotel guests.'
    );
  }

  // =========================================================
  // 25. RESTAURANT
  // =========================================================

  if (
    hasAny(
      'restaurant',
      'food',
      'dining',
      'eat',
      'eat at hotel',
      'where can i eat'
    )
  ) {
    return (
      'Yes, we have a rooftop restaurant and bar on-site. ' +
      'For the latest menu, prices, opening hours, and table availability, ' +
      'please contact the hotel directly.'
    );
  }

  // =========================================================
  // 26. BAR
  // =========================================================

  if (
    hasAny(
      'bar',
      'rooftop bar',
      'drinks',
      'drink'
    )
  ) {
    return (
      'We have a rooftop restaurant and bar on-site. ' +
      'Please contact the hotel for the latest menu and operating hours.'
    );
  }

  // =========================================================
  // 27. HOUSEKEEPING
  // =========================================================

  if (
    hasAny(
      'housekeeping',
      'cleaning',
      'room cleaning',
      'clean my room',
      'clean room'
    )
  ) {
    return (
      'Daily housekeeping is provided. ' +
      'If you need additional towels, toiletries, or other room supplies, ' +
      'please contact the front desk.'
    );
  }

  // =========================================================
  // 28. FRONT DESK
  // =========================================================

  if (
    hasAny(
      'front desk',
      'reception',
      'reception desk',
      'hotel reception'
    )
  ) {
    return (
      'Our front desk is available 24/7 to assist hotel guests.'
    );
  }

  // =========================================================
  // 29. SECURITY
  // =========================================================

  if (
    hasAny(
      'security',
      'safe',
      'safety',
      'security staff'
    )
  ) {
    return (
      'We provide 24/7 security and 24/7 front desk support. ' +
      'Please report any safety concerns to the front desk immediately.'
    );
  }

  // =========================================================
  // 30. PARKING
  // =========================================================

  if (
    hasAny(
      'parking',
      'car parking',
      'park my car',
      'motorbike parking',
      'parking space'
    )
  ) {
    return (
      'For current parking availability and parking arrangements, ' +
      'please contact the hotel directly at +855 69 527 788.'
    );
  }

  // =========================================================
  // 31. TRANSPORTATION
  // =========================================================

  if (
    hasAny(
      'transport',
      'transportation',
      'taxi',
      'airport transfer',
      'transfer',
      'pickup',
      'pick up',
      'drop off'
    )
  ) {
    return (
      'For transportation, taxi, or transfer arrangements, please contact the hotel ' +
      'in advance at +855 69 527 788. Availability and fees should be confirmed directly with the hotel.'
    );
  }

  // =========================================================
  // 32. CHILDREN
  // =========================================================

  if (
    hasAny(
      'child',
      'children',
      'kid',
      'kids',
      'baby',
      'infant',
      'family with child'
    )
  ) {
    return (
      'The Executive Residence Suite accommodates up to 2 adults and 1 child. ' +
      'The Family Residence Suite accommodates up to 4 adults. ' +
      'For specific child policies, infant arrangements, cribs, or extra beds, ' +
      'please contact the hotel directly.'
    );
  }

  // =========================================================
  // 33. EXTRA BED / CRIB
  // =========================================================

  if (
    hasAny(
      'extra bed',
      'extra beds',
      'additional bed',
      'crib',
      'baby cot',
      'cot'
    )
  ) {
    return (
      'Extra-bed and crib availability is not specified in our current information. ' +
      'Please contact the hotel directly at +855 69 527 788 to confirm availability and pricing.'
    );
  }

  // =========================================================
  // 34. PETS
  // =========================================================

  if (
    hasAny(
      'pet',
      'pets',
      'dog',
      'cat',
      'bring my pet'
    )
  ) {
    return (
      'Our current information does not specify a pet policy. ' +
      'Please contact the hotel directly before bringing a pet.'
    );
  }

  // =========================================================
  // 35. SMOKING
  // =========================================================

  if (
    hasAny(
      'smoking',
      'smoke',
      'smoking room',
      'non-smoking',
      'non smoking'
    )
  ) {
    return (
      'Our current information does not specify the smoking policy. ' +
      'Please contact the hotel directly for the latest smoking rules.'
    );
  }

  // =========================================================
  // 36. ACCESSIBILITY
  // =========================================================

  if (
    hasAny(
      'accessible',
      'accessibility',
      'wheelchair',
      'disabled',
      'disability',
      'mobility'
    )
  ) {
    return (
      'Detailed accessibility information is not currently available in our local knowledge base. ' +
      'Guests with accessibility requirements should contact the hotel before booking at +855 69 527 788.'
    );
  }

  // =========================================================
  // 37. LONG STAY
  // =========================================================

  if (
    hasAny(
      'long stay',
      'long-stay',
      'monthly',
      'weekly',
      'stay for a month',
      'extended stay',
      'long term',
      'long-term'
    )
  ) {
    return (
      'New Kampot Hotel & Residence offers serviced residence-style accommodation. ' +
      'For weekly, monthly, or extended-stay rates, please contact the hotel directly.'
    );
  }

  // =========================================================
  // 38. BUSINESS TRAVEL
  // =========================================================

  if (
    hasAny(
      'business trip',
      'business traveler',
      'business travel',
      'work trip',
      'business room'
    )
  ) {
    return (
      'The Deluxe Twin Room can be suitable for business travelers, and free high-speed Wi-Fi ' +
      'is available throughout the hotel. For specific business facilities or services, please contact the hotel.'
    );
  }

  // =========================================================
  // 39. AMENITIES
  // =========================================================

  if (
    hasAny(
      'amenities',
      'facilities',
      'hotel facilities',
      'what does the hotel have',
      'what facilities'
    )
  ) {
    return (
      'Our main on-site amenities include:\n\n' +
      '• Outdoor Swimming Pool\n' +
      '• Fitness Center\n' +
      '• Rooftop Restaurant & Bar\n' +
      '• Free High-Speed Wi-Fi\n' +
      '• Daily Housekeeping\n' +
      '• 24/7 Security\n' +
      '• 24/7 Front Desk'
    );
  }

  // =========================================================
  // 40. PRIVACY POLICY
  // =========================================================

  if (
    hasAny(
      'privacy',
      'privacy policy',
      'data policy',
      'personal information'
    )
  ) {
    return (
      'You can read our Privacy Policy here: ' +
      'https://newkampothotel.com/privacy-policy'
    );
  }

  // =========================================================
  // 41. HOTEL NAME
  // =========================================================

  if (
    hasAny(
      'hotel name',
      'what hotel',
      'name of hotel',
      'who are you'
    )
  ) {
    return 'We are New Kampot Hotel & Residence in Kampot, Cambodia.';
  }

  // =========================================================
  // 42. GENERAL HOTEL INFORMATION
  // =========================================================

  if (
    hasAny(
      'about hotel',
      'about the hotel',
      'tell me about hotel',
      'tell me about the hotel',
      'hotel information',
      'information about hotel'
    )
  ) {
    return (
      'New Kampot Hotel & Residence is a hotel and serviced residence located on National Road 33, ' +
      'Kampot, Cambodia. We offer Deluxe Double, Deluxe Twin, Executive Residence Suite, ' +
      'and Family Residence Suite accommodation, along with free Wi-Fi, an outdoor swimming pool, ' +
      'fitness center, rooftop restaurant and bar, daily housekeeping, and 24/7 front desk and security.'
    );
  }

  // =========================================================
  // 43. WEEKDAY / WEEKEND
  // =========================================================

  if (
    hasAny(
      'weekday price',
      'weekday rate',
      'weekend price',
      'weekend rate',
      'weekday or weekend',
      'weekend rates'
    )
  ) {
    return (
      'Our reference rates are:\n\n' +
      '• Deluxe Double: $45 weekday / $55 weekend\n' +
      '• Deluxe Twin: $50 weekday / $60 weekend\n' +
      '• Executive Residence Suite: $85 weekday / $100 weekend\n' +
      '• Family Residence Suite: $120 weekday / $140 weekend\n\n' +
      'Please confirm the final rate for your specific dates with the hotel.'
    );
  }

  // =========================================================
  // 44. MAXIMUM OCCUPANCY
  // =========================================================

  if (
    hasAny(
      'maximum occupancy',
      'max occupancy',
      'how many people',
      'how many guests',
      'how many adults',
      'number of guests'
    )
  ) {
    return (
      'Maximum listed occupancy:\n\n' +
      '• Deluxe Double: 2 adults\n' +
      '• Deluxe Twin: 2 adults\n' +
      '• Executive Residence Suite: 2 adults + 1 child\n' +
      '• Family Residence Suite: 4 adults'
    );
  }

  // =========================================================
  // 45. ROOM COMPARISON
  // =========================================================

  if (
    hasAny(
      'compare rooms',
      'room comparison',
      'which room should i choose',
      'which room is best',
      'difference between rooms'
    )
  ) {
    return (
      'Here is a quick room guide:\n\n' +
      '• Deluxe Double — 1 King Bed, up to 2 adults, $45 weekday / $55 weekend\n' +
      '• Deluxe Twin — 2 Single Beds, up to 2 adults, $50 weekday / $60 weekend\n' +
      '• Executive Residence Suite — Super King + living area, up to 2 adults + 1 child, $85 weekday / $100 weekend\n' +
      '• Family Residence Suite — 2 bedrooms, 2 King Beds, up to 4 adults, $120 weekday / $140 weekend'
    );
  }

  // =========================================================
  // 46. EMERGENCY / SAFETY
  // =========================================================

  if (
    hasAny(
      'emergency',
      'danger',
      'unsafe',
      'security problem',
      'safety problem',
      'urgent'
    )
  ) {
    return (
      'For an urgent hotel safety issue, please contact our 24/7 front desk immediately at ' +
      '+855 69 527 788. For immediate emergencies, contact the appropriate local emergency services.'
    );
  }

  // =========================================================
  // 47. COMPLAINT
  // =========================================================

  if (
    hasAny(
      'complaint',
      'complain',
      'bad experience',
      'problem with room',
      'problem with hotel',
      'not happy',
      'unhappy'
    )
  ) {
    return (
      'We are sorry to hear about your concern. Please contact our 24/7 front desk at ' +
      '+855 69 527 788 so our hotel team can assist you directly.'
    );
  }

  // =========================================================
  // 48. DEFAULT
  // =========================================================

  return null;
};


/* =========================================================
   CHAT WIDGET
   ========================================================= */

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  /* =======================================================
     MESSAGES STATE
     ======================================================= */

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);

      if (!saved) {
        return [PRIVACY_MESSAGE];
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [PRIVACY_MESSAGE];
      }

      return parsed.map((message: ChatMessage) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load saved chat messages:', error);
      return [PRIVACY_MESSAGE];
    }
  });

  /* =======================================================
     FLOW STATE
     ======================================================= */

  const [flowStep, setFlowStep] = useState<FlowStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STEP);

    if (
      saved === 'PRIVACY' ||
      saved === 'READY' ||
      saved === 'ASKING_NAME' ||
      saved === 'CHATTING'
    ) {
      return saved as FlowStep;
    }

    return 'PRIVACY';
  });

  /* =======================================================
     USER NAME STATE
     ======================================================= */

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_NAME) || '';
  });

  /* =======================================================
     PENDING QUESTION STATE
     ======================================================= */

  const [pendingQuestion, setPendingQuestion] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PENDING_Q) || '';
  });

  /* =======================================================
     UI STATE
     ======================================================= */

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* =======================================================
     PRE-WARM GEMINI SESSION ON MOUNT
     ======================================================= */

  useEffect(() => {
    getChatSession();
  }, []);

  /* =======================================================
     LOCAL STORAGE PERSISTENCE
     ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_MESSAGES,
      JSON.stringify(messages)
    );
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STEP, flowStep);
  }, [flowStep]);

  useEffect(() => {
    if (userName) {
      localStorage.setItem(STORAGE_KEY_NAME, userName);
    } else {
      localStorage.removeItem(STORAGE_KEY_NAME);
    }
  }, [userName]);

  useEffect(() => {
    if (pendingQuestion) {
      localStorage.setItem(
        STORAGE_KEY_PENDING_Q,
        pendingQuestion
      );
    } else {
      localStorage.removeItem(STORAGE_KEY_PENDING_Q);
    }
  }, [pendingQuestion]);

  /* =======================================================
     SCROLL HELPER
     ======================================================= */

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }, 50);
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();

      if (flowStep !== 'PRIVACY' && !isLoading) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [
    messages,
    isOpen,
    flowStep,
    isLoading,
    scrollToBottom,
  ]);

  /* =======================================================
     ADD MESSAGE HELPER
     ======================================================= */

  const addMessage = useCallback(
    (
      text: string,
      sender: ChatMessage['sender']
    ) => {
      const message: ChatMessage = {
        id: generateUniqueId(),
        text,
        sender,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, message]);
    },
    []
  );

  /* =======================================================
     CHECK STAFF / HUMAN AGENT REQUEST
     ======================================================= */

  const isAgentRequest = (text: string) => {
    const lowerText = text.toLowerCase().trim();

    return (
      // Human / Agent
      lowerText.includes('human') ||
      lowerText.includes('agent') ||
      lowerText.includes('representative') ||
      lowerText.includes('real person') ||
      lowerText.includes('live agent') ||

      // Staff
      lowerText.includes('staff') ||
      lowerText.includes('hotel staff') ||
      lowerText.includes('your staff') ||
      lowerText.includes('our staff') ||

      // Reception / Front Desk
      lowerText.includes('reception') ||
      lowerText.includes('receptionist') ||
      lowerText.includes('front desk') ||

      // Talk / Speak
      lowerText.includes('talk to someone') ||
      lowerText.includes('talk with someone') ||
      lowerText.includes('speak to someone') ||
      lowerText.includes('speak with someone') ||
      lowerText.includes('talk to a person') ||
      lowerText.includes('speak to a person') ||
      lowerText.includes('talk to staff') ||
      lowerText.includes('talk with staff') ||
      lowerText.includes('speak to staff') ||
      lowerText.includes('speak with staff') ||

      // Connect
      lowerText.includes('connect agent') ||
      lowerText.includes('connect me') ||

      // Facebook request
      lowerText.includes('facebook')
    );
  };

  /* =======================================================
     STREAMING RESPONSE HELPER (GEMINI AI)
     ======================================================= */

  const streamBotResponse = async (
    promptText: string,
    prefixText = ''
  ) => {
    setIsLoading(true);

    const botMsgId = generateUniqueId();
    let accumulatedText = prefixText;

    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      text: accumulatedText,
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, initialBotMsg]);

    try {
      await sendMessageStream(
        promptText,
        (chunkText: string) => {
          setIsLoading(false);

          accumulatedText += chunkText;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    text: accumulatedText,
                  }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Streaming error:', error);

      setIsLoading(false);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text:
                  'Sorry, I encountered an issue fulfilling your request.',
              }
            : msg
        )
      );
    }
  };

  /* =======================================================
     HANDLE SEND MESSAGE
     ======================================================= */

  const handleSendMessage = async (
    e?: React.FormEvent
  ) => {
    e?.preventDefault();

    const userText = inputValue.trim();

    if (!userText || isLoading) return;

    setInputValue('');

    const newUserMessage: ChatMessage = {
      id: generateUniqueId(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [
      ...prev,
      newUserMessage,
    ]);

    /* =====================================================
       1. STAFF / HUMAN AGENT REQUEST
       ===================================================== */

    if (isAgentRequest(userText)) {
      setIsLoading(true);

      setTimeout(() => {
        addMessage(
          FACEBOOK_AGENT_MESSAGE,
          'bot'
        );

        setIsLoading(false);
      }, 200);

      return;
    }

    /* =====================================================
       2. READY FLOW
       ===================================================== */

    if (flowStep === 'READY') {
      setPendingQuestion(userText);
      setFlowStep('ASKING_NAME');

      setTimeout(() => {
        addMessage(
          'May we know your name so we can personalize your experience?',
          'bot'
        );
      }, 200);

      return;
    }

    /* =====================================================
       3. ASKING NAME FLOW
       ===================================================== */

    if (flowStep === 'ASKING_NAME') {
      const name = userText;

      setUserName(name);
      setFlowStep('CHATTING');

      const question = pendingQuestion;

      setPendingQuestion('');

      /* -----------------------------------------------------
         Check if pending question is a staff request
         ----------------------------------------------------- */

      if (isAgentRequest(question)) {
        addMessage(
          FACEBOOK_AGENT_MESSAGE,
          'bot'
        );

        return;
      }

      const isGreeting =
        /^(hi|hello|hey|good day|good morning|good evening)$/i.test(
          question.trim()
        );

      if (isGreeting || !question) {
        addMessage(
          `Delighted to assist you, **${name}**! How can I help you with your stay today?`,
          'bot'
        );

        return;
      }

      /* -----------------------------------------------------
         Check Local Knowledge Base first
         ----------------------------------------------------- */

      const localAnswer =
        checkLocalKnowledgeBase(question);

      if (localAnswer) {
        addMessage(
          `Delighted to assist you, **${name}**!\n\n${localAnswer}`,
          'bot'
        );

        return;
      }

      /* -----------------------------------------------------
         Fallback to Gemini AI
         ----------------------------------------------------- */

      await streamBotResponse(
        `The user's name is ${name}. Answer their question: "${question}"`,
        `Delighted to assist you, **${name}**!\n\n`
      );

      return;
    }

    /* =====================================================
       4. NORMAL STREAMING CHAT
       ===================================================== */

    const localAnswer =
      checkLocalKnowledgeBase(userText);

    if (localAnswer) {
      setIsLoading(true);

      setTimeout(() => {
        addMessage(
          localAnswer,
          'bot'
        );

        setIsLoading(false);
      }, 150);

      return;
    }

    /* -----------------------------------------------------
       Fallback to Gemini AI
       ----------------------------------------------------- */

    await streamBotResponse(userText);
  };

  /* =========================================================
     PRIVACY AGREEMENT
     ========================================================= */

  const handleAgreePrivacy = () => {
    const agreeUserMessage: ChatMessage = {
      id: generateUniqueId(),
      text: 'I Agree',
      sender: 'user',
      timestamp: new Date(),
    };

    const welcomeBotMessage: ChatMessage = {
      id: generateUniqueId(),
      text:
        'Thank you. How may we assist your stay at New Kampot Hotel & Residence today?',
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages((prev) => [
      ...prev,
      agreeUserMessage,
      welcomeBotMessage,
    ]);

    setFlowStep('READY');
  };

  /* =========================================================
     END CHAT
     ========================================================= */

  const handleEndChat = () => {
    localStorage.removeItem(
      STORAGE_KEY_MESSAGES
    );

    localStorage.removeItem(
      STORAGE_KEY_STEP
    );

    localStorage.removeItem(
      STORAGE_KEY_NAME
    );

    localStorage.removeItem(
      STORAGE_KEY_PENDING_Q
    );

    resetChatSession();

    setMessages([PRIVACY_MESSAGE]);
    setFlowStep('PRIVACY');
    setUserName('');
    setPendingQuestion('');
    setInputValue('');
    setIsLoading(false);
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">

      {isOpen && (
        <div className="bg-white w-[380px] h-[600px] max-h-[82vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 mb-4 transition-all duration-300 ease-in-out origin-bottom-right">

          {/* =================================================
              HEADER
              ================================================= */}

          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-5 py-4 flex items-center justify-between shadow-md z-10">

            <div className="flex items-center gap-3">

              <div className="bg-white/15 border border-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                <Hotel
                  size={20}
                  className="text-amber-100"
                />
              </div>

              <div>
                <h3 className="font-serif font-semibold text-sm tracking-wide text-white">
                  NEW KAMPOT
                </h3>

                <p className="text-amber-100/90 text-[11px] flex items-center gap-1.5 font-normal">

                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm animate-pulse" />

                  Online ChatBot Assistant

                </p>
              </div>

            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-amber-100 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>

          </div>

          {/* =================================================
              MESSAGES AREA
              ================================================= */}

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {/* Privacy Agree Button */}

            {flowStep === 'PRIVACY' && (
              <div className="flex justify-center my-4 animate-fade-in">

                <button
                  onClick={handleAgreePrivacy}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  I Agree
                </button>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {/* =================================================
              INPUT & FOOTER
              ================================================= */}

          {flowStep !== 'PRIVACY' && (
            <div className="p-3.5 bg-white border-t border-slate-100">

              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >

                <div className="flex-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/10 transition-all">

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) =>
                      setInputValue(e.target.value)
                    }
                    placeholder={
                      flowStep === 'ASKING_NAME'
                        ? 'Enter your name...'
                        : 'Ask about rooms, dining, check-in...'
                    }
                    className="w-full bg-transparent border-none focus:outline-none px-4 py-3 text-xs text-slate-800 placeholder-slate-400 font-medium"
                    disabled={isLoading}
                  />

                </div>

                <button
                  type="submit"
                  disabled={
                    !inputValue.trim() ||
                    isLoading
                  }
                  className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-md active:scale-95 cursor-pointer"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>

              </form>

              {/* Action Strip */}

              <div className="flex items-center justify-end mt-2 px-1">

                <button
                  onClick={handleEndChat}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  End Session
                </button>

              </div>

            </div>
          )}

        </div>
      )}

      {/* =====================================================
          FLOATING BUTTON
          ===================================================== */}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-gradient-to-tr from-amber-600 to-amber-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-amber-500/30 cursor-pointer ${
          isOpen
            ? 'scale-0 opacity-0'
            : 'scale-100 opacity-100'
        }`}
        style={{
          transitionDuration: '300ms',
        }}
        aria-label="Open chat"
      >
        <MessageSquare size={24} />
      </button>

    </div>
  );
};

export default ChatWidget;
