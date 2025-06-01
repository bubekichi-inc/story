'use server';

import { prisma } from '@/lib/prisma';
import { SendGridService } from '@/app/_services/SendGridService';
import { revalidatePath } from 'next/cache';

type RegistrationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function registerEmail(email: string): Promise<RegistrationResult> {
  try {
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        success: false,
        error: '有効なメールアドレスを入力してください',
      };
    }

    // Check if email already exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { email },
    });

    if (existingRegistration) {
      return {
        success: false,
        error: 'このメールアドレスは既に登録されています',
      };
    }

    // Save to database
    const registration = await prisma.registration.create({
      data: {
        email,
      },
    });

    // Send notification emails
    const sendGridService = new SendGridService();

    // Email to the registrant
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>事前登録ありがとうございます！</h2>
        <p>この度は StoryCastAI の事前登録をしていただき、ありがとうございます。</p>
        <p>アーリーアクセスの準備が整いましたら、ご登録いただいたメールアドレス（${email}）宛にご連絡いたします。</p>
        <p>今後ともどうぞよろしくお願いいたします。</p>
        <br>
        <p>StoryCastAI チーム</p>
      </div>
    `;

    await sendGridService.sendEmail({
      to: email,
      subject: '【StoryCastAI】事前登録ありがとうございます',
      html: userEmailHtml,
    });

    // Email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bubekichi.com';
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>新規事前登録のお知らせ</h2>
        <p>StoryCastAI に新しい事前登録がありました。</p>
        <p><strong>メールアドレス:</strong> ${email}</p>
        <p><strong>登録日時:</strong> ${registration.createdAt.toLocaleString('ja-JP')}</p>
      </div>
    `;

    await sendGridService.sendEmail({
      to: adminEmail,
      subject: '【StoryCastAI】新規事前登録',
      html: adminEmailHtml,
    });

    // Revalidate any pages that might display registration count
    revalidatePath('/');

    return {
      success: true,
      message: 'ご登録ありがとうございます！アーリーアクセスの準備が整いましたらご連絡いたします。',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: '登録中にエラーが発生しました。しばらく時間をおいて再度お試しください。',
    };
  }
}
