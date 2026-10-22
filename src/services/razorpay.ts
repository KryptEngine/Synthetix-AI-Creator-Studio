const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<boolean> | null = null;

/** Loads the Razorpay checkout script once per page. */
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Opens the Razorpay overlay. Resolves with the signed payment payload, or
 * null when the buyer dismisses the window.
 */
export async function openRazorpayCheckout(options: {
  key: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
}): Promise<RazorpayCheckoutResult | null> {
  const loaded = await loadRazorpayCheckout();
  if (!loaded) {
    throw new Error('Could not reach the Razorpay checkout script. Check your connection.');
  }

  const Ctor = (window as any).Razorpay;
  if (!Ctor) {
    throw new Error('Razorpay checkout is unavailable in this browser.');
  }

  return new Promise((resolve, reject) => {
    const instance = new Ctor({
      key: options.key,
      order_id: options.orderId,
      amount: options.amountPaise,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: options.prefill || {},
      theme: { color: '#15DDF5' },
      handler: (response: RazorpayCheckoutResult) => resolve(response),
      modal: { ondismiss: () => resolve(null) }
    });
    instance.open();
  });
}
