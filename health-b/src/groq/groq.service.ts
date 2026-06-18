import { Injectable } from '@nestjs/common';
import { Groq } from 'groq-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { parseISO, addDays, getDay } from 'date-fns';
import { MEDICAL_SYSTEM_PROMPT, groqTools } from './prompt';

@Injectable()
export class GroqService {
  private groq: Groq;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly appointmentsService: AppointmentsService,
  ) {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  /**
   * Check if a date is a weekday (Monday-Friday)
   */
  private isWeekday(date: Date): boolean {
    const day = getDay(date);
    return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * Remove raw tool call markup from model responses before streaming to the client.
   */
  private stripToolCallMarkup(text: string): string {
    return text.replace(/<function.*?<\/function>/gs, '').trim();
  }

  /**
   * Check available slots for a specific doctor on a given date
   */
  async checkAvailableSlots(doctorId: number, date: string): Promise<string[]> {
    return this.appointmentsService.checkAllSlotsAvailability(doctorId, date);
  }

  /**
   * Find next available date starting from a given date
   */
  async findNextAvailableDate(
    doctorId: number,
    startDate: string,
    maxDaysAhead: number = 7,
  ): Promise<{ date: string; slots: string[] } | null> {
    let currentDate = parseISO(startDate);

    for (let i = 0; i < maxDaysAhead; i++) {
      // Only check weekdays
      if (this.isWeekday(currentDate)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const slots = await this.checkAvailableSlots(doctorId, dateStr);

        if (slots.length > 0) {
          return {
            date: dateStr,
            slots,
          };
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return null;
  }

  /**
   * Process user message and generate AI response using the Groq tool execution loop.
   * Supports both custom conversation history array, and database-sourced session execution.
   */
  async processUserMessage(
    conversationHistoryOrUserId: any[] | number,
    sessionId?: number,
    userMessage?: string,
    context?: Record<string, any>,
  ): Promise<any> {
    try {
      let conversationHistory: any[] = [];
      let patientId: number = 1;

      if (Array.isArray(conversationHistoryOrUserId)) {
        conversationHistory = [...conversationHistoryOrUserId];
        if (sessionId) {
          const session = await this.prismaService.chatSession.findUnique({
            where: { id: sessionId },
          });
          patientId = session ? session.userId : 1;
        }
      } else {
        const userId = conversationHistoryOrUserId;
        patientId = userId;
        if (!sessionId || !userMessage) {
          throw new Error('sessionId and userMessage are required');
        }

        const messages = await this.prismaService.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });

        conversationHistory = messages
          .map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          }))
          .concat({ role: 'user', content: userMessage });
      }

      const todayDateStr = new Date().toISOString().split('T')[0];
      const dynamicSystemPrompt = `${MEDICAL_SYSTEM_PROMPT}\n\nIMPORTANT: Today's date is ${todayDateStr}. Resolve all relative dates (today, tomorrow, next week, etc.) based strictly on this date.`;

      let loopCount = 0;
      const MAX_LOOPS = 4;
      let finalResponseText = '';

      while (loopCount < MAX_LOOPS) {
        loopCount++;

        const response = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: dynamicSystemPrompt },
            ...conversationHistory,
          ],
          tools: groqTools as any,
          tool_choice: 'auto',
          stream: false,
          temperature: 0.3,
          max_tokens: 1024,
        });

        const message = response.choices?.[0]?.message;
        const toolCalls = message?.tool_calls;
        let hasToolExecuted = false;

        if (toolCalls && toolCalls.length > 0) {
          conversationHistory.push({
            role: 'assistant',
            content: this.stripToolCallMarkup(message.content || ''),
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            let functionArgs: any = {};
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
            } catch (err) {}

            let toolResult = await this.executeTool(functionName, functionArgs, patientId);

            conversationHistory.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: functionName,
              content: JSON.stringify(toolResult),
            });
          }
          hasToolExecuted = true;
        } else {
          const textResponse = message?.content || '';
          const match = textResponse.match(/<function(?:=|>)([^>(\s]+)[>(]?(.*?)<\/function>/);
          
          if (match) {
            const functionName = match[1];
            let rawArgs = match[2];
            if (rawArgs.endsWith(')')) rawArgs = rawArgs.slice(0, -1);
            if (rawArgs.startsWith('(')) rawArgs = rawArgs.slice(1);

            let functionArgs: any = {};
            try {
              functionArgs = JSON.parse(rawArgs);
            } catch (err) {}

            let toolResult = await this.executeTool(functionName, functionArgs, patientId);

            conversationHistory.push({
              role: 'assistant',
              content: this.stripToolCallMarkup(textResponse),
            });
            conversationHistory.push({
              role: 'user',
              content: `Function "${functionName}" returned result: ${JSON.stringify(toolResult)}`,
            });
            hasToolExecuted = true;
          } else {
            finalResponseText = textResponse;
            break;
          }
        }
      }

      if (!finalResponseText) {
        finalResponseText = "I've completed the requested actions.";
      }

      return this.createTextResponseStream(this.stripToolCallMarkup(finalResponseText));
    } catch (error) {
      console.error('Error in Groq service processUserMessage:', error);
      return this.createTextResponseStream(
        'I apologize, but I am currently having trouble connecting to the medical AI service. Please try again in a few moments.',
      );
    }
  }

  private async executeTool(functionName: string, functionArgs: any, patientId: number): Promise<any> {
    try {
      const doctor = await this.prismaService.doctor.findFirst();
      const doctorId = doctor ? doctor.id : 1;

      if (functionName === 'checkAvailableSlots') {
        const date = functionArgs.date;
        if (date) {
          const slots = await this.checkAvailableSlots(doctorId, date);
          return { date, availableSlots: slots };
        }
        return { error: 'Missing parameter: date' };
      } 
      
      if (functionName === 'findNextAvailableDate') {
        const startDate = functionArgs.startDate;
        if (startDate) {
          const result = await this.findNextAvailableDate(doctorId, startDate);
          if (result) return { found: true, date: result.date, availableSlots: result.slots };
          return { found: false, message: 'No slots found in the next 7 days.' };
        }
        return { error: 'Missing parameter: startDate' };
      } 
      
      if (functionName === 'createAppointment') {
        const { date, time, reason } = functionArgs;
        if (date && time && reason) {
          const appointment = await this.appointmentsService.createAppointment(patientId, doctorId, date, time, reason);
          return { success: true, message: 'Appointment successfully created.', appointmentId: appointment.id, date: appointment.date, time: appointment.time, status: appointment.status };
        }
        return { error: 'Missing parameter(s). Required: date, time, reason' };
      }

      return { error: `Tool ${functionName} not supported.` };
    } catch (err) {
      console.error('Execute tool error:', err);
      return { error: 'Scheduling system database is temporarily unavailable.' };
    }
  }

  /**
   * Helper function to yield text chunk-by-chunk to simulate streaming typing effect
   */
  private async *createTextResponseStream(
    text: string,
  ): AsyncGenerator<any, void, unknown> {
    const chunkSize = 10;
    let index = 0;
    while (index < text.length) {
      const nextChunk = text.slice(index, index + chunkSize);
      index += chunkSize;
      yield {
        choices: [
          {
            delta: {
              content: nextChunk,
            },
          },
        ],
      };
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  /**
   * Save chat message to database
   */
  async saveChatMessage(
    sessionId: number,
    role: 'user' | 'bot',
    content: string,
    context?: Record<string, any>,
  ) {
    return this.prismaService.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        context: context || {},
      },
    });
  }

  async updateChatMessage(
    messageId: number,
    content: string,
    context?: Record<string, any>,
  ) {
    return this.prismaService.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        context: context || {},
      },
    });
  }

  /**
   * Create a new chat session
   */
  async createChatSession(userId: number, title: string = 'New Chat') {
    return this.prismaService.chatSession.create({
      data: {
        userId,
        title,
      },
    });
  }

  /**
   * Get chat session with messages
   */
  async getChatSession(sessionId: number) {
    return this.prismaService.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get all sessions for a user
   */
  async getUserChatSessions(userId: number) {
    return this.prismaService.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Just the last message
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Extract appointment details from user message
   */
  extractAppointmentDetails(message: string): {
    requestedDate?: string;
    requestedTime?: string;
  } {
    // Simple regex patterns for dates and times
    const datePattern =
      /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|tomorrow|today|next\s+\w+day)/i;
    const timePattern = /(\d{1,2}:\d{2}|[0-9]+(?:am|pm|AM|PM))/;

    const dateMatch = message.match(datePattern);
    const timeMatch = message.match(timePattern);

    return {
      requestedDate: dateMatch ? dateMatch[0] : undefined,
      requestedTime: timeMatch ? timeMatch[0] : undefined,
    };
  }

  /**
   * Interpret classification model results using Groq
   */
  async interpretDiseaseModel(
    aiResult: {
      model: string;
      prediction: string;
      confidence: number;
      all_probs: Record<string, number>;
    },
    doctorMessage: string = '',
  ): Promise<string> {
    try {
      const systemPrompt = `You are a clinical AI assistant helping doctors interpret diagnostic imaging results. Given an AI model's output, explain the diagnosis clearly: what the prediction means, confidence interpretation, probability breakdown, and recommended clinical next steps. If the doctor asked a specific question, answer it directly first. Never claim to replace clinical judgment.`;

      const formattedProbs = Object.entries(aiResult.all_probs)
        .map(([cls, prob]) => `- ${cls}: ${prob}%`)
        .join('\n');

      let userContent = `The diagnostic AI model "${aiResult.model}" analyzed an image and returned the following result:\n`;
      userContent += `- Predicted Class: ${aiResult.prediction}\n`;
      userContent += `- Confidence Score: ${aiResult.confidence}%\n\n`;
      userContent += `Full Probability Breakdown:\n${formattedProbs}\n\n`;

      if (doctorMessage && doctorMessage.trim().length > 0) {
        userContent += `Doctor's Question:\n"${doctorMessage}"\n\n`;
      }

      userContent += `Please provide your detailed clinical interpretation:`;

      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      return (
        response.choices?.[0]?.message?.content ||
        'No interpretation generated.'
      );
    } catch (error: any) {
      console.error('Failed to get Groq interpretation for disease:', error);
      throw new Error(`Groq service error: ${error.message || error}`);
    }
  }
}
