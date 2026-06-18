import {
  Controller,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
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
      gradcam_image_base64?: string;
    },
  ) {
    const { ai_result, doctor_message } = body;

    if (!ai_result) {
      throw new BadRequestException({
        error: 'Missing ai_result in request body',
      });
    }

    const { model, prediction, confidence, all_probs } = ai_result;
    if (!model || !prediction || confidence === undefined || !all_probs) {
      throw new BadRequestException({
        error: 'Invalid or incomplete ai_result payload',
      });
    }

    try {
      const interpretation = await this.groqService.interpretDiseaseModel(
        ai_result,
        doctor_message || '',
      );
      const report_base64 = await this.generateDiseaseReportPdf({
        ai_result,
        interpretation,
        doctor_message: doctor_message || '',
        gradcam_image_base64: body.gradcam_image_base64,
      });
      return { interpretation, report_base64 };
    } catch (error: any) {
      console.error('Error in detect-disease endpoint:', error);
      throw new InternalServerErrorException({
        error: error.message || 'Failed to interpret disease prediction',
      });
    }
  }

  private async generateDiseaseReportPdf(params: {
    ai_result: {
      model: string;
      prediction: string;
      confidence: number;
      all_probs: Record<string, number>;
    };
    interpretation: string;
    doctor_message: string;
    gradcam_image_base64?: string;
  }): Promise<string> {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 36 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    doc.addPage({ size: 'A4', margin: 36 });
    doc.fontSize(18).text('MedVision Diagnostic Report', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('gray')
      .text(`Generated: ${new Date().toLocaleString()}`, {
        align: 'center',
      });
    doc.moveDown(1);

    doc.fillColor('black').fontSize(12).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Model: ${params.ai_result.model.toUpperCase()}`);
    doc.text(`Prediction: ${params.ai_result.prediction}`);
    doc.text(`Confidence: ${params.ai_result.confidence}%`);
    doc.moveDown(0.5);

    doc.fontSize(11).text('Class Probabilities:');
    Object.entries(params.ai_result.all_probs).forEach(([label, prob]) => {
      doc.text(`- ${label}: ${prob}%`);
    });

    if (params.doctor_message) {
      doc.moveDown(0.5);
      doc.fontSize(11).text('Doctor Notes / Question:');
      doc.fontSize(10).fillColor('black').text(params.doctor_message, {
        indent: 12,
      });
    }

    doc.moveDown(1);
    doc.fontSize(12).text('Clinical Interpretation', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(params.interpretation, {
      align: 'left',
      paragraphGap: 4,
    });

    if (params.gradcam_image_base64) {
      try {
        const imageBuffer = Buffer.from(params.gradcam_image_base64, 'base64');
        doc.addPage({ size: 'A4', margin: 36 });
        doc.fontSize(12).text('Grad-CAM Visual Overlay', { underline: true });
        doc.moveDown(0.5);
        doc.image(imageBuffer, {
          fit: [500, 400],
          align: 'center',
          valign: 'center',
        });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .text(
            'This page contains the Grad-CAM overlay of the uploaded image, highlighting model attention.',
            {
              align: 'left',
            },
          );
      } catch (error) {
        console.warn('Unable to attach Grad-CAM image to PDF:', error);
      }
    }

    doc.end();
    await new Promise((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);
    return pdfBuffer.toString('base64');
  }
}
