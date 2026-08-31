import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

const ZENDESK_SUBDOMAIN =
  process.env.ZENDESK_SUBDOMAIN;

const SUNSHINE_APP_ID =
  process.env.SUNSHINE_APP_ID;

const SUNSHINE_KEY_ID =
  process.env.SUNSHINE_KEY_ID;

const SUNSHINE_KEY_SECRET =
  process.env.SUNSHINE_KEY_SECRET;

/*
|--------------------------------------------------------------------------
| Validate environment variables
|--------------------------------------------------------------------------
*/

if (
  !ZENDESK_SUBDOMAIN ||
  !SUNSHINE_APP_ID ||
  !SUNSHINE_KEY_ID ||
  !SUNSHINE_KEY_SECRET
) {
  console.error('');
  console.error(
    'ERROR: Missing Zendesk Sunshine environment variables.'
  );
  console.error('');
  console.error('Required:');
  console.error('ZENDESK_SUBDOMAIN');
  console.error('SUNSHINE_APP_ID');
  console.error('SUNSHINE_KEY_ID');
  console.error('SUNSHINE_KEY_SECRET');
  console.error('');

  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Sunshine API
|--------------------------------------------------------------------------
*/

const SUNSHINE_BASE_URL =
  `https://${ZENDESK_SUBDOMAIN}.zendesk.com/sc/v2/apps/${SUNSHINE_APP_ID}`;

/*
|--------------------------------------------------------------------------
| Basic Authentication
|--------------------------------------------------------------------------
*/

const sunshineAuth =
  Buffer.from(
    `${SUNSHINE_KEY_ID}:${SUNSHINE_KEY_SECRET}`
  ).toString('base64');

/*
|--------------------------------------------------------------------------
| Generic Sunshine API request
|--------------------------------------------------------------------------
*/

async function sunshineRequest(
  endpoint,
  options = {}
) {
  const url =
    `${SUNSHINE_BASE_URL}${endpoint}`;

  console.log('');
  console.log(
    `[Sunshine] ${options.method || 'GET'} ${endpoint}`
  );

  const response = await fetch(
    url,
    {
      ...options,

      headers: {
        Authorization:
          `Basic ${sunshineAuth}`,

        'Content-Type':
          'application/json',

        Accept:
          'application/json',

        ...(options.headers || {}),
      },
    }
  );

  const responseText =
    await response.text();

  let data;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    data = {
      raw: responseText,
    };
  }

  if (!response.ok) {
    console.error(
      '[Sunshine] API ERROR:',
      response.status,
      data
    );

    const error = new Error(
      `Sunshine API returned ${response.status}`
    );

    error.status =
      response.status;

    error.data = data;

    throw error;
  }

  console.log(
    '[Sunshine] Success:',
    response.status
  );

  return data;
}

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      ok: true,
      service:
        'SPS Zendesk Sunshine Backend',
    });
  }
);

/*
|--------------------------------------------------------------------------
| CREATE USER
|--------------------------------------------------------------------------
|
| Creates a Sunshine user using externalId.
|
|--------------------------------------------------------------------------
*/

async function createSunshineUser(
  externalId,
  name
) {
  try {
    const result =
      await sunshineRequest(
        '/users',
        {
          method: 'POST',

          body: JSON.stringify({
            externalId,

            profile: {
              givenName:
                name ||
                'SPS Visitor',
            },
          }),
        }
      );

    return (
      result?.user ||
      result
    );
  } catch (error) {
    /*
     * User may already exist.
     *
     * Try to retrieve the existing user.
     */

    console.log(
      '[Sunshine] User may already exist.'
    );

    try {
      const existingUser =
        await sunshineRequest(
          `/users/${encodeURIComponent(
            externalId
          )}`,
          {
            method: 'GET',
          }
        );

      return (
        existingUser?.user ||
        existingUser
      );
    } catch {
      throw error;
    }
  }
}

/*
|--------------------------------------------------------------------------
| CREATE CONVERSATION
|--------------------------------------------------------------------------
|
| POST /api/zendesk/conversation
|
| Body:
|
| {
|   userId: "sps_user_123",
|   name: "John"
| }
|
|--------------------------------------------------------------------------
*/

app.post(
  '/api/zendesk/conversation',
  async (req, res) => {
    try {
      const {
        userId,
        name,
      } = req.body;

      if (!userId) {
        return res.status(400).json({
          error:
            'userId is required',
        });
      }

      /*
       * Sunshine externalId
       */
      const externalId =
        String(userId)
          .trim()
          .substring(0, 255);

      /*
       * ------------------------------------------------------
       * 1. Create / find user
       * ------------------------------------------------------
       */

      const user =
        await createSunshineUser(
          externalId,
          name
        );

      console.log(
        '[Sunshine] User:',
        user
      );

      /*
       * ------------------------------------------------------
       * 2. Create conversation
       * ------------------------------------------------------
       */

      const conversationResponse =
        await sunshineRequest(
          '/conversations',
          {
            method: 'POST',

            body: JSON.stringify({
              type: 'personal',

              participants: [
                {
                  userExternalId:
                    externalId,
                },
              ],
            }),
          }
        );

      const conversation =
        conversationResponse?.conversation ||
        conversationResponse;

      const conversationId =
        conversation?.id;

      if (!conversationId) {
        console.error(
          '[Sunshine] Invalid conversation response:',
          conversationResponse
        );

        return res.status(500).json({
          error:
            'Zendesk did not return a conversation ID',

          response:
            conversationResponse,
        });
      }

      console.log(
        '[Sunshine] Conversation created:',
        conversationId
      );

      /*
       * ------------------------------------------------------
       * 3. Send initial message
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * author.type = "user"
       *
       * MUST include:
       *
       * userExternalId
       *
       * This fixes your 400 error.
       * ------------------------------------------------------
       */

      try {
        await sunshineRequest(
          `/conversations/${encodeURIComponent(
            conversationId
          )}/messages`,
          {
            method: 'POST',

            body: JSON.stringify({
              author: {
                type: 'user',

                userExternalId:
                  externalId,
              },

              content: {
                type: 'text',

                text:
                  'The customer is requesting to speak with a human support agent.',
              },
            }),
          }
        );
      } catch (messageError) {
        /*
         * Conversation was created successfully,
         * but initial message failed.
         *
         * We don't destroy the conversation.
         */

        console.error(
          '[Sunshine] Initial message failed:',
          messageError
        );
      }

      /*
       * ------------------------------------------------------
       * Return data to React
       * ------------------------------------------------------
       */

      return res.json({
        success: true,

        user: {
          id:
            user?.id ||
            user?.userId ||
            null,

          externalId,
        },

        conversation: {
          id: conversationId,
        },
      });
    } catch (error) {
      console.error('');
      console.error(
        'Create Zendesk conversation error:'
      );
      console.error(error);
      console.error('');

      return res.status(
        error?.status || 500
      ).json({
        error:
          'Failed to create Zendesk conversation',

        message:
          error instanceof Error
            ? error.message
            : 'Unknown error',

        details:
          error?.data || null,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET CONVERSATION
|--------------------------------------------------------------------------
|
| Used internally to identify the user associated
| with the conversation.
|
|--------------------------------------------------------------------------
*/

async function getConversation(
  conversationId
) {
  const result =
    await sunshineRequest(
      `/conversations/${encodeURIComponent(
        conversationId
      )}`,
      {
        method: 'GET',
      }
    );

  return (
    result?.conversation ||
    result
  );
}

/*
|--------------------------------------------------------------------------
| SEND MESSAGE
|--------------------------------------------------------------------------
|
| POST /api/zendesk/send
|
| Body:
|
| {
|   conversationId: "...",
|   text: "Hello"
| }
|
|--------------------------------------------------------------------------
*/

app.post(
  '/api/zendesk/send',
  async (req, res) => {
    try {
      const {
        conversationId,
        text,
      } = req.body;

      if (!conversationId) {
        return res.status(400).json({
          error:
            'conversationId is required',
        });
      }

      if (
        !text ||
        !String(text).trim()
      ) {
        return res.status(400).json({
          error:
            'Message text is required',
        });
      }

      /*
       * ------------------------------------------------------
       * Get conversation
       * ------------------------------------------------------
       */

      const conversation =
        await getConversation(
          conversationId
        );

      /*
       * ------------------------------------------------------
       * Find user participant
       * ------------------------------------------------------
       */

      const participants =
        Array.isArray(
          conversation?.participants
        )
          ? conversation.participants
          : [];

      const userParticipant =
        participants.find(
          (participant) =>
            participant?.userExternalId
        );

      if (
        !userParticipant?.userExternalId
      ) {
        console.error(
          '[Sunshine] Could not determine conversation user:',
          conversation
        );

        return res.status(400).json({
          error:
            'Could not determine the user associated with this conversation.',
        });
      }

      const userExternalId =
        userParticipant.userExternalId;

      console.log(
        '[Sunshine] Sending message as:',
        userExternalId
      );

      /*
       * ------------------------------------------------------
       * Send message
       * ------------------------------------------------------
       */

      const result =
        await sunshineRequest(
          `/conversations/${encodeURIComponent(
            conversationId
          )}/messages`,
          {
            method: 'POST',

            body: JSON.stringify({
              author: {
                type: 'user',

                userExternalId,
              },

              content: {
                type: 'text',

                text:
                  String(text).trim(),
              },
            }),
          }
        );

      return res.json({
        success: true,

        message:
          result?.message ||
          result,
      });
    } catch (error) {
      console.error('');
      console.error(
        'Send Zendesk message error:'
      );
      console.error(error);
      console.error('');

      return res.status(
        error?.status || 500
      ).json({
        error:
          'Failed to send Zendesk message',

        message:
          error instanceof Error
            ? error.message
            : 'Unknown error',

        details:
          error?.data || null,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET CONVERSATION MESSAGES
|--------------------------------------------------------------------------
|
| GET:
|
| /api/zendesk/messages?conversationId=...
|
|--------------------------------------------------------------------------
*/

app.get(
  '/api/zendesk/messages',
  async (req, res) => {
    try {
      const {
        conversationId,
      } = req.query;

      if (!conversationId) {
        return res.status(400).json({
          error:
            'conversationId is required',
        });
      }

      const data =
        await sunshineRequest(
          `/conversations/${encodeURIComponent(
            conversationId
          )}/messages`,
          {
            method: 'GET',
          }
        );

      const messages =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.messages
            )
          ? data.messages
          : [];

      return res.json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error('');
      console.error(
        'Get Zendesk messages error:'
      );
      console.error(error);
      console.error('');

      return res.status(
        error?.status || 500
      ).json({
        error:
          'Failed to retrieve Zendesk messages',

        message:
          error instanceof Error
            ? error.message
            : 'Unknown error',

        details:
          error?.data || null,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET SINGLE CONVERSATION
|--------------------------------------------------------------------------
|
| Useful for debugging.
|
|--------------------------------------------------------------------------
*/

app.get(
  '/api/zendesk/conversation/:id',
  async (req, res) => {
    try {
      const conversationId =
        req.params.id;

      if (!conversationId) {
        return res.status(400).json({
          error:
            'Conversation ID is required',
        });
      }

      const conversation =
        await getConversation(
          conversationId
        );

      return res.json({
        success: true,
        conversation,
      });
    } catch (error) {
      console.error(
        'Get conversation error:',
        error
      );

      return res.status(
        error?.status || 500
      ).json({
        error:
          'Failed to retrieve conversation',

        message:
          error instanceof Error
            ? error.message
            : 'Unknown error',

        details:
          error?.data || null,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
    });
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    console.error(
      'Unhandled server error:',
      error
    );

    res.status(500).json({
      error:
        'Internal server error',
    });
  }
);

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log('');
    console.log(
      '========================================'
    );
    console.log(
      '   SPS ZENDESK SUNSHINE BACKEND'
    );
    console.log(
      '========================================'
    );
    console.log(
      `Server: http://localhost:${PORT}`
    );
    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );
    console.log(
      `Zendesk: ${ZENDESK_SUBDOMAIN}.zendesk.com`
    );
    console.log(
      `Sunshine App: ${SUNSHINE_APP_ID}`
    );
    console.log(
      `Key ID: ${SUNSHINE_KEY_ID}`
    );
    console.log(
      'Secret loaded: YES'
    );
    console.log(
      '========================================'
    );
    console.log('');
  }
);