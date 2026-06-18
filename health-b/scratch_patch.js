const fs = require('fs');
const path = 'c:/PFE/health-b/src/groq/groq.service.ts';
let code = fs.readFileSync(path, 'utf8');

const startIdx = code.indexOf('async processUserMessage(');
const endStr = 'private async *createTextResponseStream(';
const endIdx = code.indexOf(endStr);

const newMethod = `async processUserMessage(
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
      const dynamicSystemPrompt = \`\${MEDICAL_SYSTEM_PROMPT}\\n\\nIMPORTANT: Today's date is \${todayDateStr}. Resolve all relative dates (today, tomorrow, next week, etc.) based strictly on this date.\`;

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
          const match = textResponse.match(/<function(?:=|>)([^>(\\s]+)[>(]?(.*?)<\\/function>/);
          
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
              content: \`Function "\${functionName}" returned result: \${JSON.stringify(toolResult)}\`,
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

      return { error: \`Tool \${functionName} not supported.\` };
    } catch (err) {
      console.error('Execute tool error:', err);
      return { error: 'Scheduling system database is temporarily unavailable.' };
    }
  }

  /**
   * Helper function to yield text chunk-by-chunk to simulate streaming typing effect
   */
  `;

const finalCode = code.substring(0, startIdx) + newMethod + code.substring(endIdx + 87);
const exactEndIdx = code.indexOf(endStr);
fs.writeFileSync(path, code.substring(0, startIdx) + newMethod + code.substring(exactEndIdx), 'utf8');
console.log('Successfully patched groq.service.ts');
