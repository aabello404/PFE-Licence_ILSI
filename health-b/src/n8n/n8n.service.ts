import { Injectable } from '@nestjs/common';

@Injectable()
export class N8nService {
    async sendEmail(to: string, subject: string, text: string) {
        const response = await fetch('http://localhost:5678/webhook/635b064a-1d9f-4ed8-aa20-510f5bad516f', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                subject,
                text,
            }),
        });
        return response.ok;
    }
   
}
