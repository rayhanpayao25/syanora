import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

/*
|--------------------------------------------------------------------------
| Configuration & Environment Validation
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN;
const SUNSHINE_APP_ID = process.env.SUNSHINE_APP_ID;
const SUNSHINE_KEY_ID = process.env.SUNSHINE_KEY_ID;
const SUNSHINE_KEY_SECRET = process.env.SUNSHINE_KEY_SECRET;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

if (!ZENDESK_SUBDOMAIN || !SUNSHINE_APP_ID || !SUNSHINE_KEY_ID || !SUNSHINE_KEY_SECRET) {
  console.error('\nERROR: Missing required Zendesk Sunshine environment variables.\n');
  console.error('Required variables:');
  console.error('- ZENDESK_SUBDOMAIN');
  console.error('- SUNSHINE_APP_ID');
  console.error('- SUNSHINE_KEY_ID');
  console.error('- SUNSHINE_KEY_SECRET\n');
  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Middleware & Setup
|--------------------------------------------------------------------------
*/

// Secure CORS configuration (Prevents unauthorized origins from accessing your API)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matching origins
      if (!origin || origin === CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy: Origin not allowed'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Sunshine API Base Configuration
|--------------------------------------------------------------------------
*/

const SUNSHINE_BASE_URL = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/sc/v2/apps/${SUNSHINE_APP_ID}`;

// Safely base64 encode using UTF-8 to handle special characters
const sunshineAuth = Buffer.from(`${SUNSHINE_KEY_ID}:${SUNSHINE_KEY_SECRET}`, 'utf-8').toString('base64');

/**
 * Generic Fetch Wrapper for Sunshine Conversations API v2
 */
async function sunshineRequest(endpoint, options = {}) {
  const url = `${SUNSHINE_BASE_URL}${endpoint}`;
  console.log(`\n[Sunshine] ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${sunshineAuth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const responseText = await response.text();
  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  if (!response.ok) {
    console.error('[Sunshine] API ERROR:', response.status, data);
    const error = new Error(`Sunshine API returned status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  console.log('[Sunshine] Success:', response.status);
  return data;
}

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

/**
 * Creates a Sunshine User or fetches the existing user if already created.
 */
async function createSunshineUser(externalId, name) {
  try {
    const result = await sunshineRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        externalId,
        profile: {
          givenName: name || 'SPS Visitor',
        },
      }),
    });

    return result?.user || result;
  } catch (error) {
    console.log('[Sunshine] User creation note: Checking if user already exists...');

    try {
      const existingUser = await sunshineRequest(`/users/${encodeURIComponent(externalId)}`, {
        method: 'GET',
      });

      return existingUser?.user || existingUser;
    } catch {
      throw error;
    }
  }
}

/**
 * Retrieves conversation details by ID.
 */
async function getConversation(conversationId) {
  const result = await sunshineRequest(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'GET',
  });

  return result?.conversation || result;
}

/*
|--------------------------------------------------------------------------
| Express Routes
|--------------------------------------------------------------------------
*/

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'SPS Zendesk Sunshine Backend',
  });
});

// Create Conversation Route
app.post('/api/zendesk/conversation', async (req, res) => {
  try {
    const { userId, name } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const externalId = String(userId).trim().substring(0, 255);

    // 1. Create or retrieve user
    const user = await createSunshineUser(externalId, name);
    console.log('[Sunshine] User validated:', user?.id || externalId);

    // 2. Create personal conversation
    const conversationResponse = await sunshineRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        type: 'personal',
        participants: [
          {
            userExternalId: externalId,
          },
        ],
      }),
    });

    const conversation = conversationResponse?.conversation || conversationResponse;
    const conversationId = conversation?.id;

    if (!conversationId) {
      console.error('[Sunshine] Invalid conversation response:', conversationResponse);
      return res.status(500).json({
        error: 'Zendesk did not return a valid conversation ID',
        response: conversationResponse,
      });
    }

    console.log('[Sunshine] Conversation created:', conversationId);

    // 3. Send initial agent request notification message
    try {
      await sunshineRequest(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          author: {
            type: 'user',
            userExternalId: externalId,
          },
          content: {
            type: 'text',
            text: 'The customer is requesting to speak with a human support agent.',
          },
        }),
      });
    } catch (messageError) {
      console.error('[Sunshine] Initial message sending failed (non-fatal):', messageError);
    }

    return res.json({
      success: true,
      user: {
        id: user?.id || user?.userId || null,
        externalId,
      },
      conversation: {
        id: conversationId,
      },
    });
  } catch (error) {
    console.error('Create Zendesk conversation error:', error);
    return res.status(error?.status || 500).json({
      error: 'Failed to create Zendesk conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error?.data || null,
    });
  }
});

// Send Message Route
app.post('/api/zendesk/send', async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // 1. Get conversation to locate external user participant
    const conversation = await getConversation(conversationId);
    const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
    const userParticipant = participants.find((p) => p?.userExternalId);

    if (!userParticipant?.userExternalId) {
      console.error('[Sunshine] User participant not found for conversation:', conversationId);
      return res.status(400).json({
        error: 'Could not determine the user associated with this conversation.',
      });
    }

    const userExternalId = userParticipant.userExternalId;
    console.log('[Sunshine] Sending message as user:', userExternalId);

    // 2. Post message to Sunshine
    const result = await sunshineRequest(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        author: {
          type: 'user',
          userExternalId,
        },
        content: {
          type: 'text',
          text: String(text).trim(),
        },
      }),
    });

    return res.json({
      success: true,
      message: result?.message || result,
    });
  } catch (error) {
    console.error('Send Zendesk message error:', error);
    return res.status(error?.status || 500).json({
      error: 'Failed to send Zendesk message',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error?.data || null,
    });
  }
});

// Get Messages Route
app.get('/api/zendesk/messages', async (req, res) => {
  try {
    const { conversationId } = req.query;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const data = await sunshineRequest(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'GET',
    });

    const messages = Array.isArray(data)
      ? data
      : Array.isArray(data?.messages)
      ? data.messages
      : [];

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Get Zendesk messages error:', error);
    return res.status(error?.status || 500).json({
      error: 'Failed to retrieve Zendesk messages',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error?.data || null,
    });
  }
});

// Get Single Conversation Details Endpoint
app.get('/api/zendesk/conversation/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const conversation = await getConversation(conversationId);

    return res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(error?.status || 500).json({
      error: 'Failed to retrieve conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error?.data || null,
    });
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({
    error: 'Internal server error',
  });
});

/*
|--------------------------------------------------------------------------
| Server Start
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('    SPS ZENDESK SUNSHINE BACKEND');
  console.log('========================================');
  console.log(`Server running: http://localhost:${PORT}`);
  console.log(`Health check:   http://localhost:${PORT}/api/health`);
  console.log(`Zendesk domain: ${ZENDESK_SUBDOMAIN}.zendesk.com`);
  console.log(`Sunshine App:   ${SUNSHINE_APP_ID}`);
  console.log(`Allowed CORS:   ${CLIENT_ORIGIN}`);
  console.log('========================================\n');
});