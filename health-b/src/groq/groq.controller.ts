import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { GroqService } from './groq.service';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/constans';

@Controller('groq')
export class GroqController {
  constructor(private readonly groqService: GroqService) {}

  /**
   * Create a new chat session
   */
  @UseGuards(AuthGuard)
  @Post('session/create')
  async createSession(@Request() req: any, @Body() body: { title?: string }) {
    const userId = req.user.id;
    const session = await this.groqService.createChatSession(
      userId,
      body.title || 'New Chat',
    );
    return session;
  }

  /**
   * Get user's chat sessions
   */
  @UseGuards(AuthGuard)
  @Get('sessions')
  async getSessions(@Request() req: any) {
    const userId = req.user.id;
    return this.groqService.getUserChatSessions(userId);
  }

  /**
   * Get a specific chat session
   */
  @UseGuards(AuthGuard)
  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    const session = await this.groqService.getChatSession(parseInt(sessionId));
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  /**
   * Send message with streaming response
   */
  @UseGuards(AuthGuard)
  @Post('chat/send')
  async sendMessage(
    @Body()
    body: {
      sessionId: number;
      message: string;
      context?: Record<string, any>;
    },
    @Request() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const { sessionId, message, context } = body;

    if (!message || !sessionId) {
      throw new BadRequestException('sessionId and message are required');
    }

    try {
      // Save user message
      await this.groqService.saveChatMessage(
        sessionId,
        'user',
        message,
        context,
      );

      // Create bot placeholder for streaming updates
      const botMessage = await this.groqService.saveChatMessage(
        sessionId,
        'bot',
        '',
        context,
      );

      // Set response headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();

      // Get streaming response from Groq
      const stream = await this.groqService.processUserMessage(
        userId,
        sessionId,
        message,
        context,
      );

      let fullResponse = '';

      // Stream chunks to client
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
          try {
            await this.groqService.updateChatMessage(
              botMessage.id,
              fullResponse,
              context,
            );
          } catch (dbError) {
            console.error('Failed to update streaming bot message:', dbError);
          }
        }
      }

      // Save final bot response to database if any content arrived
      if (fullResponse.length > 0) {
        await this.groqService.updateChatMessage(
          botMessage.id,
          fullResponse,
          context,
        );
      }

      // Send completion signal
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.write(
        `data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * Check available appointments for a doctor on a specific date
   */
  @Public()
  @Get('availability/:doctorId/:date')
  async checkAvailability(
    @Param('doctorId') doctorId: string,
    @Param('date') date: string,
  ) {
    const slots = await this.groqService.checkAvailableSlots(
      parseInt(doctorId),
      date,
    );
    return {
      date,
      availableSlots: slots,
      hasAvailability: slots.length > 0,
    };
  }

  /**
   * Find next available date for appointments
   */
  @Public()
  @Post('availability/next')
  async findNextAvailable(
    @Body()
    body: {
      doctorId: number;
      startDate: string;
      maxDaysAhead?: number;
    },
  ) {
    const result = await this.groqService.findNextAvailableDate(
      body.doctorId,
      body.startDate,
      body.maxDaysAhead || 7,
    );

    if (!result) {
      return {
        found: false,
        message: 'No available slots found in the specified period',
      };
    }

    return {
      found: true,
      date: result.date,
      availableSlots: result.slots,
    };
  }

  /**
   * Extract appointment details from message (helper endpoint)
   */
  @Post('extract-appointment-details')
  extractAppointmentDetails(@Body() body: { message: string }) {
    const details = this.groqService.extractAppointmentDetails(body.message);
    return details;
  }
}
