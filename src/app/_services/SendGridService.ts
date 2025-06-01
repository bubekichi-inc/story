import { MailService } from '@sendgrid/mail';

export class SendGridService {
  mailService: MailService;

  constructor() {
    this.mailService = new MailService();
    this.mailService.setApiKey(process.env.SENDGRID_API_KEY || '');
  }

  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
      await this.mailService.send({
        to,
        from: 'noreply.storycastai@bubekichi.com',
        subject,
        html,
      });
    } catch (error) {
      console.error('SendGridAPIError: ', error);
    }
  }
}
