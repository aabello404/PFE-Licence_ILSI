# Medical Chatbot Implementation Guide

## Overview

This document outlines the complete implementation of the medical chatbot with AI-powered appointment booking and symptom checking integration.

## What's Been Implemented

### 1. **Database Schema Updates** ✅

Added two new tables to support conversation history:

#### ChatSession Table

```sql
- id: Primary Key (Int)
- userId: Foreign Key to User
- title: String (e.g., "Medical Chat")
- createdAt: DateTime
- updatedAt: DateTime
```

#### ChatMessage Table

```sql
- id: Primary Key (Int)
- sessionId: Foreign Key to ChatSession (with cascade delete)
- role: String ("user" or "bot")
- content: String (the actual message)
- context: JSON (stores appointment details, symptoms, etc.)
- createdAt: DateTime
```

**Run migration:**

```bash
npx prisma migrate dev --name add_chat_tables
```

### 2. **Backend Implementation** ✅

#### Groq Service (`src/groq/groq.service.ts`)

Comprehensive service with the following features:

**Key Functions:**

- `processUserMessage()` - Streams responses from Groq AI
- `checkAvailableSlots()` - Checks available appointment times for a doctor
- `findNextAvailableDate()` - Finds the next available workday with slots
- `extractAppointmentDetails()` - Extracts dates/times from user messages
- `saveChatMessage()` - Persists messages to database
- `createChatSession()` - Creates new chat sessions
- `getUserChatSessions()` - Retrieves user's chat history

**Features:**

- Streaming responses with `stream: true`
- Automatic next-day fallback (checks if tomorrow is available if today is full)
- Workday validation (only Monday-Friday)
- Full conversation context for better responses

#### Groq Controller (`src/groq/groq.controller.ts`)

REST API endpoints:

- `POST /groq/session/create` - Create new chat session
- `GET /groq/sessions` - List all user sessions
- `GET /groq/session/:sessionId` - Get specific session with messages
- `POST /groq/chat/send` - Send message with streaming response
- `GET /groq/availability/:doctorId/:date` - Check slot availability
- `POST /groq/availability/next` - Find next available date
- `POST /groq/extract-appointment-details` - Extract date/time from text

### 3. **Frontend Implementation** ✅

#### Updated ChatBotPage Component (`MedVisionF/src/components/ChatBot/ChatBotPage.tsx`)

**Key Changes:**

1. **Merged UI Buttons** - Combined "Make an Appointment" and "Check Symptoms" into one unified flow
2. **Backend Integration** - Real API calls instead of simulated responses
3. **Streaming Support** - Handles Server-Sent Events (SSE) for real-time responses
4. **Session Management** - Creates backend sessions for persistent chat history
5. **Context Tracking** - Sends user type, timestamp, and other context

**New Features:**

- Real-time message streaming from Groq AI
- Automatic session creation
- Loading states and error handling
- Improved UX with unified appointment/symptom flow

## Configuration & Setup

### 1. **Environment Variables**

Create a `.env` file in the `health-b` root directory:

```env
# Database (already configured)
DATABASE_URL="postgresql://user:password@localhost:5432/myhealth"

# Groq API Key (Required)
GROQ_API_KEY="your-groq-api-key-here"

# Server
PORT=3000
```

**Get your Groq API Key:**

1. Visit [console.groq.com](https://console.groq.com)
2. Create an account or log in
3. Navigate to API keys
4. Create a new API key
5. Copy and paste it into `.env`

### 2. **Dependencies**

Already installed:

- `groq-sdk`: ^1.1.2
- `date-fns`: Latest (newly installed)

If missing, run:

```bash
npm install groq-sdk date-fns
```

### 3. **API Base URL**

Update the frontend API calls if your backend is not on `localhost:3000`:

In `ChatBotPage.tsx`, replace:

```javascript
'http://localhost:3000/groq/...';
```

With your actual backend URL.

## How It Works

### User Flow (Merged Appointment & Symptom Checking)

1. **User selects** "Make an Appointment" or "Check Symptoms" (now unified)
2. **Initial greeting** - Bot welcomes user and explains capabilities
3. **User messages** - Can ask to:
   - "I want an appointment on May 15 at 9:00"
   - "I have a headache and feeling nauseous"
   - "Do you have any slots tomorrow morning?"
4. **Groq processes** - AI understands intent and context
5. **System checks availability** - If appointment booking:
   - Checks requested date/time
   - If not available, checks tomorrow (if workday)
   - Returns available slots
6. **Response streamed** - Real-time response shown to user
7. **Persistence** - All messages saved to database

### Appointment Booking Logic

When user says: _"I want an appointment on May 15 at 9:00"_

1. Groq extracts: `date: "2026-05-15"`, `time: "09:00"`
2. System calls `checkAvailableSlots(doctorId, "2026-05-15")`
3. If available (e.g., `["09:00", "14:00"]`):
   - Bot responds: "Perfect! 9:00 AM is available. Shall I confirm?"
4. If NOT available:
   - System calls `findNextAvailableDate()` for next 7 days
   - Checks only weekdays
   - If May 16 has slots: "May 15 is full, but tomorrow (May 16) has 9:00 available"

## API Response Examples

### Chat Message Stream

```
POST /groq/chat/send

Response (Server-Sent Events):
data: {"content":"Great"}
data: {"content":"! I"}
data: {"content":"'ll help"}
data: [DONE]
```

### Check Availability

```
GET /groq/availability/1/2026-05-15

Response:
{
  "date": "2026-05-15",
  "availableSlots": ["09:00", "14:00"],
  "hasAvailability": true
}
```

### Find Next Available

```
POST /groq/availability/next

Body:
{
  "doctorId": 1,
  "startDate": "2026-05-15",
  "maxDaysAhead": 7
}

Response:
{
  "found": true,
  "date": "2026-05-16",
  "availableSlots": ["09:00", "14:00"]
}
```

## Testing the Implementation

### 1. Start the Backend

```bash
cd c:\PFE\health-b
npm run start:dev
```

### 2. Start the Frontend

```bash
cd c:\PFE\MedVisionF
npm run dev
```

### 3. Test in Browser

1. Navigate to `http://localhost:5173` (or your frontend URL)
2. Log in
3. Go to ChatBot page
4. Select appointment/symptoms option
5. Try messages like:
   - "I want an appointment tomorrow at 9 AM"
   - "Do you have any available slots next week?"
   - "I have a fever and cough"

### 4. Test Streaming (Optional - in DevTools)

Open Network tab and check:

- `POST /groq/chat/send` shows as `text/event-stream`
- Messages arrive incrementally

## Future Enhancements

### Phase 2 (As mentioned by user):

- [ ] Implement disease detection with image analysis
- [ ] Multi-doctor selection
- [ ] Real appointment creation integration
- [ ] SMS/Email notifications
- [ ] Advanced symptom analysis with differential diagnosis

### Suggested Improvements:

- [ ] Add conversation context window optimization
- [ ] Implement retry logic for API failures
- [ ] Add typing indicators in chat
- [ ] Store session analytics
- [ ] Add fallback responses if Groq is unavailable
- [ ] Implement rate limiting on chat endpoints

## Troubleshooting

### "GROQ_API_KEY not found"

- Ensure `.env` file exists in `health-b` root
- Restart the backend after adding `.env`
- Verify key is valid on Groq console

### Streaming responses not working

- Check browser DevTools → Network tab
- Verify response headers include `Content-Type: text/event-stream`
- Ensure frontend properly reads response body

### Appointments not showing availability

- Verify doctor exists in database
- Check appointments table for existing bookings
- Confirm date format is `YYYY-MM-DD`

### Chat messages not saving

- Ensure ChatSession and ChatMessage tables exist
- Run: `npx prisma migrate status`
- Check database connection in `.env`

## Key Files Modified

### Backend:

- `src/groq/groq.service.ts` - Main service logic
- `src/groq/groq.controller.ts` - API endpoints
- `src/groq/groq.module.ts` - Module configuration
- `src/appointments/appointments.module.ts` - Export service
- `prisma/schema.prisma` - Database schema

### Frontend:

- `src/components/ChatBot/ChatBotPage.tsx` - Main UI component

### Database:

- `prisma/migrations/[timestamp]_add_chat_tables/` - Migration files

## Architecture Diagram

```
Frontend (React)
    ↓
ChatBotPage Component
    ↓
API Calls (POST /groq/chat/send)
    ↓
Backend (NestJS)
    ├─ GroqController
    │   └─ GroqService
    │       ├─ Groq AI (Streaming)
    │       └─ AppointmentsService (Check Slots)
    │
    └─ Database
        ├─ ChatSession
        ├─ ChatMessage
        ├─ Appointment
        └─ Doctor
```

## Notes

- All messages are stored with context (user role, timestamp, etc.)
- Streaming ensures real-time feedback
- Groq Model: `mixtral-8x7b-32768` (can be changed in groq.service.ts)
- Max history: Last 20 messages per request (can be adjusted)
- Daily slots: 9:00 AM and 2:00 PM (configure in appointments.service.ts)
