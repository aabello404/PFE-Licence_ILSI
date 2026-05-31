# Quick Start Guide - Medical Chatbot

## Prerequisites

- Backend running on port 3000
- Frontend running on port 5173
- PostgreSQL database
- Groq API key

## Setup Steps

### 1. Backend Configuration

Create `.env` file in `health-b/`:

```env
DATABASE_URL="postgresql://[user]:[password]@localhost:5432/myhealth"
GROQ_API_KEY="gsk_xxxxxxxxxxxx"
PORT=3000
```

### 2. Install Dependencies

```bash
cd c:\PFE\health-b
npm install date-fns  # Already done, just for reference
```

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add_chat_tables  # Already done
```

### 4. Start Backend

```bash
npm run start:dev
```

### 5. Start Frontend

```bash
cd c:\PFE\MedVisionF
npm run dev
```

## Testing

1. Open http://localhost:5173
2. Login with your credentials
3. Navigate to ChatBot
4. Click "Make an Appointment" or "Check Symptoms"
5. Send a message like:
   - "I need an appointment tomorrow at 9 AM"
   - "What time slots are available next week?"
   - "I have a headache"

## Verify Setup

### Check Backend Groq Endpoint

```bash
curl -X POST http://localhost:3000/groq/session/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

### Check Database

```bash
# In PostgreSQL
SELECT * FROM "ChatSession" LIMIT 5;
SELECT * FROM "ChatMessage" LIMIT 5;
```

## Merged Features (What Changed)

✅ **Before:** Two separate buttons (Appointment + Symptoms)
✅ **After:** One unified button that handles both

The AI now intelligently routes based on:

- User intent detection
- Automatic slot checking
- Smart date suggestions (tomorrow if today full)
- Symptom analysis and booking recommendations

## Important Notes

- **Streaming Enabled:** Messages appear in real-time as Groq processes them
- **Context Saved:** All conversations stored in database
- **Smart Scheduling:** If requested date has no slots, checks tomorrow automatically
- **Workday Only:** Only checks Monday-Friday for appointments
- **Available Slots:** Currently 9:00 AM and 2:00 PM (customize in appointments.service.ts)

## Customization

### Change Available Time Slots

Edit `src/appointments/appointments.service.ts`:

```typescript
const allSlots = ['9:00', '14:00']; // Modify this array
```

### Change AI Model

Edit `src/groq/groq.service.ts`:

```typescript
model: 'mixtral-8x7b-32768',  // Change this model name
```

### Change Max Days Ahead

Edit `src/groq/groq.controller.ts`:

```typescript
body.maxDaysAhead || 7; // Change default from 7 days
```

## Troubleshooting

| Issue                    | Solution                                |
| ------------------------ | --------------------------------------- |
| "GROQ_API_KEY not found" | Add to .env and restart backend         |
| Blank chat responses     | Check GROQ_API_KEY is valid             |
| Messages not streaming   | Check Network tab has text/event-stream |
| 404 endpoints            | Verify backend is running on port 3000  |
| Database errors          | Run `npx prisma migrate reset`          |

## Next Steps (Phase 2)

- [ ] Implement disease detection (requires model training)
- [ ] Add appointment creation confirmation
- [ ] Email/SMS notifications
- [ ] Multi-doctor selection
- [ ] Admin dashboard for chat analytics
