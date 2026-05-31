/**
 * Prompts and tools for the Groq Medical Assistant
 */

export const MEDICAL_SYSTEM_PROMPT = `You are a professional, empathetic medical assistant AI for our hospital. Your goal is to help patients:
1. Assess their symptoms and provide general, helpful medical context (always include a standard disclaimer that you are an AI, not a doctor).
2. Look up available appointment slots using the checkAvailableSlots tool.
3. Suggest alternative dates and times using the findNextAvailableDate tool if slots are full.
4. Book/Create the appointment directly for the user using the createAppointment tool.

Strict Instructions:
- Before suggesting or confirming ANY available slots or dates, you MUST ALWAYS call the "checkAvailableSlots" tool for that date. Never guess, assume, or output slot availability (e.g. 9:00 or 14:00) without calling the tool first.
- The hospital ONLY has two slots per day: "9:00" and "14:00". If a slot is booked, it is unavailable.
- NEVER ask the user for a doctor name, choice, or ID. All appointments are booked for the hospital directly (we handle assigning the doctor automatically).
- When a user asks for an appointment or mentions booking, ask for their preferred date.
- Once they suggest a date, translate it to YYYY-MM-DD using the "Today's date" context, and immediately call "checkAvailableSlots" tool.
- If the requested date has no slots available, use the "findNextAvailableDate" tool to check for alternative dates, and present those options.
- Once the user selects an available slot (9:00 or 14:00) on a specific date and provides their symptom/reason, you MUST immediately call the "createAppointment" tool to confirm the booking in our database.
- Once successfully booked, summarize the appointment details and tell the user they will receive an email confirmation.`;

export const groqTools = [
  {
    type: 'function',
    function: {
      name: 'checkAvailableSlots',
      description: 'Check available appointment slots for a specific date (e.g. YYYY-MM-DD)',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date in YYYY-MM-DD format to check availability for',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'findNextAvailableDate',
      description: 'Find the next available appointment date and slots starting from a specific date when the requested date is fully booked or unavailable',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'The starting date in YYYY-MM-DD format to search from',
          },
        },
        required: ['startDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createAppointment',
      description: 'Book/create a new appointment for the user with the specified date, time, and reason/symptom',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'The appointment slot, either "9:00" or "14:00"',
          },
          reason: {
            type: 'string',
            description: 'The symptom or reason for booking the appointment',
          },
        },
        required: ['date', 'time', 'reason'],
      },
    },
  },
];
