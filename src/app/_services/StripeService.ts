import Stripe from 'stripe';

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export interface CreateCheckoutSessionParams {
  customerId?: string;
  customerEmail: string;
  plan: 'BASIC';
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export class StripeService {
  // 料金プランの定義
  static readonly PLANS = {
    BASIC: {
      name: 'BASICプラン',
      price: 2980,
      priceId: process.env.STRIPE_PRICE_ID_BASIC,
      features: [
        '投稿機能無制限',
        'スケジュール投稿',
        'Instagram・X・Threads連携',
        '画像アップロード',
        'AI文章生成',
      ],
    },
  } as const;

  // 顧客を作成
  static async createCustomer(email: string): Promise<Stripe.Customer> {
    return await getStripe().customers.create({
      email,
    });
  }

  // チェックアウトセッションを作成（サブスクリプション）
  static async createCheckoutSession({
    customerId,
    customerEmail,
    plan,
    successUrl,
    cancelUrl,
  }: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    const planConfig = this.PLANS[plan];

    if (!planConfig.priceId) {
      throw new Error(`Price ID for ${plan} plan is not configured`);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      locale: 'ja',
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = customerEmail;
    }

    return await getStripe().checkout.sessions.create(sessionParams);
  }

  // カスタマーポータルセッションを作成
  static async createPortalSession({
    customerId,
    returnUrl,
  }: CreatePortalSessionParams): Promise<Stripe.BillingPortal.Session> {
    return await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // サブスクリプション情報を取得
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await getStripe().subscriptions.retrieve(subscriptionId);
  }

  // 顧客のサブスクリプション一覧を取得
  static async listSubscriptions(customerId: string): Promise<Stripe.ApiList<Stripe.Subscription>> {
    return await getStripe().subscriptions.list({
      customer: customerId,
      status: 'all',
    });
  }

  // サブスクリプションをキャンセル
  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await getStripe().subscriptions.cancel(subscriptionId);
  }

  // Webhookの検証
  static constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return getStripe().webhooks.constructEvent(payload, signature, secret);
  }

  // 料金情報を取得
  static getPlanInfo(plan: keyof typeof StripeService.PLANS) {
    return this.PLANS[plan];
  }
}

export default StripeService;
