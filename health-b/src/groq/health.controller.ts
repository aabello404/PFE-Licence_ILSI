import {
  Controller,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GroqService } from './groq.service';

@Controller('health')
export class HealthController {
  constructor(private readonly groqService: GroqService) {}

  @Post('detect-disease')
  async detectDisease(
    @Body()
    body: {
      ai_result: {
        model: string;
        prediction: string;
        confidence: number;
        all_probs: Record<string, number>;
      };
      doctor_message?: string;
    },
  ) {
    const { ai_result, doctor_message } = body;

    if (!ai_result) {
      throw new BadRequestException({ error: 'Missing ai_result in request body' });
    }

    const { model, prediction, confidence, all_probs } = ai_result;
    if (!model || !prediction || confidence === undefined || !all_probs) {
      throw new BadRequestException({ error: 'Invalid or incomplete ai_result payload' });
    }

    try {
      const interpretation = await this.groqService.interpretDiseaseModel(
        ai_result,
        doctor_message || '',
      );
      return { interpretation };
    } catch (error: any) {
      console.error('Error in detect-disease endpoint:', error);
      throw new InternalServerErrorException({ error: error.message || 'Failed to interpret disease prediction' });
    }

  }
}
