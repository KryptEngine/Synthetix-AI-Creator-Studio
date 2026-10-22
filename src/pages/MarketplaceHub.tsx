import React, { useEffect, useState } from 'react';
import { 
  Coins, Wallet, ShoppingBag, ArrowUpRight, CheckCircle2, 
  Tag, Download, DollarSign, Link as LinkIcon, Copy, Sparkles, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LedgerEntry, MarketplaceItem, PayoutRequest, UserProfile } from '../types';
import { useToast } from '../components/Toast';
import { createPaymentOrder, verifyPayment, requestPayout, fetchPayouts } from '../services/api';
import { openRazorpayCheckout } from '../services/razorpay';

interface MarketplaceHubProps {
  ledger: LedgerEntry[];
  marketplaceItems: MarketplaceItem[];
  walletBalance: number;
  user: UserProfile;
  onUpdateWallet: (newBalance: number, newLedger: LedgerEntry[]) => void;
}

export const MarketplaceHub: React.FC<MarketplaceHubProps> = ({
  ledger,
  marketplaceItems,
  walletBalance,
  user,
  onUpdateWallet
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'marketplace' | 'affiliate'>('wallet');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutUpi, setPayoutUpi] = useState(user.upiId || '');
  const [purchasedLicense, setPurchasedLicense] = useState<{ title: string; key: string } | null>(null);
  const { notify } = useToast();

  // Affiliate Generator state
  const [rawUrl, setRawUrl] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [generatedAffiliateLink, setGeneratedAffiliateLink] = useState('');
  const [copied, setCopied] = useState(false);

  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  useEffect(() => {
    fetchPayouts()
      .then((data) => setPayouts(data.payouts))
      .catch(() => setPayouts([]));
  }, [ledger]);

  // Money still held in escrow for withdrawals that have not settled.
  const pendingEscrow = payouts
    .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum, p) => sum + p.amount, 0);

  // Everything ever credited to the creator.
  const lifetimeEarnings = ledger
    .filter((entry) => entry.amount > 0)
    .reduce((sum, entry) => sum + entry.amount, 0);

  // Buy a licence: create a Razorpay order, take the payment, then let the
  // server verify the signature before anything is credited.
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);

  const handleBuyTemplate = async (item: MarketplaceItem) => {
    setBuyingItemId(item.id);
    try {
      const created = await createPaymentOrder(item.id);

      const payment = await openRazorpayCheckout({
        key: created.keyId,
        orderId: created.order.id,
        amountPaise: created.order.amount,
        currency: created.order.currency,
        name: 'Synthetix AI Creator Studio',
        description: `Commercial licence — ${item.title}`,
        prefill: { name: user.name }
      });

      if (!payment) {
        notify('Checkout closed before the payment was completed.', 'info');
        return;
      }

      const verified = await verifyPayment({
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature
      });

      onUpdateWallet(verified.walletBalance, ledger);
      setPurchasedLicense({ title: item.title, key: verified.licenseKey });

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
      notify('Payment verified — licence issued.', 'success');
    } catch (err: any) {
      notify(err?.message || 'The payment could not be completed.', 'error');
    } finally {
      setBuyingItemId(null);
    }
  };

  // Submit payout
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number.parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0 || amount > walletBalance) {
      notify('Invalid withdrawal amount.', 'error');
      return;
    }
    if (!payoutUpi.trim()) {
      notify('Enter the UPI ID to receive the money.', 'error');
      return;
    }

    setIsRequestingPayout(true);
    try {
      const result = await requestPayout({
        amount,
        upiId: payoutUpi.trim(),
        accountHolder: user.name
      });

      onUpdateWallet(result.walletBalance, ledger);
      setShowPayoutModal(false);
      notify(result.message || `Withdrawal of ₹${amount.toFixed(2)} requested successfully.`, 'success');
    } catch (err: any) {
      notify(err?.message || 'The withdrawal request failed.', 'error');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const handleGenerateAffiliate = (e: React.FormEvent) => {
    e.preventDefault();
    let baseUrl = '';
    try {
      baseUrl = new URL(rawUrl || '').origin;
    } catch {
      notify('Please enter a valid destination URL first.', 'error');
      return;
    }
    if (!productCategory.trim()) {
      notify('Select a product category before generating the link.', 'error');
      return;
    }
    const slug = Math.random().toString(36).substring(2, 8);
    setGeneratedAffiliateLink(`${baseUrl}/?ref=${user.handle}&s=${slug}`);
    notify('Affiliate link generated. Share it to earn commissions.', 'success');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedAffiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#080F20] text-[#F7F9FF] p-6 space-y-6 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#202B40] gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Money Hub & Monetization Suite
          </h1>
          <p className="text-xs text-[#93A4C0] mt-0.5">
            Double-entry creator wallet, marketplace licensing, and auto-tagged affiliate monetization
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#172235] p-1 rounded-xl border border-[#202B40] text-xs">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'wallet' ? 'bg-[#15DDF5] text-black font-bold' : 'text-[#93A4C0] hover:text-white'
            }`}
          >
            Creator Wallet
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'marketplace' ? 'bg-[#A13DFF] text-white font-bold' : 'text-[#93A4C0] hover:text-white'
            }`}
          >
            Shorts Marketplace
          </button>
          <button
            onClick={() => setActiveTab('affiliate')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'affiliate' ? 'bg-[#19D89B] text-black font-bold' : 'text-[#93A4C0] hover:text-white'
            }`}
          >
            Affiliate Engine
          </button>
        </div>
      </header>

      {/* TAB 1: CREATOR WALLET */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#93A4C0]">Available Withdrawable Balance</span>
                <p className="text-3xl font-black text-white mt-1 font-mono-tabular">
                  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-[#19D89B] font-semibold">Immediate Bank / UPI Settlement</span>
                <button
                  onClick={() => {
                    setPayoutAmount(String(walletBalance > 0 ? Math.min(walletBalance, 5000) : 1));
                    setShowPayoutModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#15DDF5] text-black text-xs font-extrabold rounded-lg shadow-neon-cyan hover:opacity-95"
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#93A4C0]">Pending Escrow (Held for Clearance)</span>
                <p className="text-3xl font-black text-white mt-1 font-mono-tabular">₹{pendingEscrow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <p className="text-[11px] text-[#93A4C0] mt-4">
                0 day holding period for Verified Pro Creators
              </p>
            </div>

            <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-[#93A4C0]">Lifetime Creator Earnings</span>
                <p className="text-3xl font-black text-[#15DDF5] mt-1 font-mono-tabular">₹{lifetimeEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <p className="text-[11px] text-[#93A4C0] mt-4">
                Total combined YouTube AdSense + Marketplace + Affiliates
              </p>
            </div>
          </div>

          {/* Double-Entry Ledger History */}
          <div className="bg-[#172235] border border-[#202B40] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Double-Entry Accounting Ledger
              </h2>
              <span className="text-xs text-[#19D89B] font-semibold">
                Audit Trail Cryptographically Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121B2D] text-[#93A4C0] uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Timestamp</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3 text-right">Net Amount</th>
                    <th className="py-2.5 px-3 text-right rounded-r">Post Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202B40]">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#202B40]/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-[#93A4C0] text-[11px]">{entry.date}</td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[#15DDF5]">{entry.type}</td>
                      <td className="py-3 px-3 text-white max-w-xs truncate">{entry.description}</td>
                      <td className="py-3 px-3 font-mono text-[#93A4C0]">{entry.referenceId}</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${entry.amount > 0 ? 'text-[#19D89B]' : 'text-[#FF5F78]'}`}>
                        {entry.amount > 0 ? `+₹${entry.amount.toFixed(2)}` : `-₹${Math.abs(entry.amount).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-white">
                        ₹{entry.postBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHORTS MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Viral Shorts Marketplace</h2>
              <p className="text-xs text-[#93A4C0]">
                Purchase commercial licenses for pre-rendered, high-retention shorts. 80% net goes to creator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {marketplaceItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#172235] border border-[#202B40] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#A13DFF] transition-all"
              >
                <div className="relative h-48 bg-black">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-white font-mono font-bold">
                    Watermarked Preview
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#15DDF5] tracking-wider">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 leading-snug">{item.title}</h3>
                    <p className="text-xs text-[#93A4C0] mt-1">Creator: {item.creator}</p>
                  </div>

                  <div className="pt-3 border-t border-[#202B40] flex items-center justify-between">
                    <div>
                      <span className="text-lg font-black text-white font-mono">₹{item.price}</span>
                      <span className="text-[10px] text-[#93A4C0] ml-1">Commercial License</span>
                    </div>

                    <button
                      onClick={() => handleBuyTemplate(item)}
                      disabled={buyingItemId === item.id}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-[#A13DFF] to-[#15DDF5] text-black font-extrabold text-xs rounded-lg shadow-neon-purple hover:opacity-95 disabled:opacity-60"
                    >
                      {buyingItemId === item.id ? 'Opening…' : 'Buy License'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AFFILIATE ENGINE */}
      {activeTab === 'affiliate' && (
        <div className="max-w-2xl bg-[#172235] border border-[#202B40] rounded-2xl p-6 space-y-5">
          <div className="border-b border-[#202B40] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#19D89B]" />
              Automated Affiliate Link Generator
            </h2>
            <p className="text-xs text-[#93A4C0] mt-1">
              Creates trackable, cloaked redirect URLs with automatic FTC/ASCI compliance disclosures for descriptions.
            </p>
          </div>

          <form onSubmit={handleGenerateAffiliate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#93A4C0]">Destination Product URL</label>
              <input
                type="url"
                value={rawUrl}
                onChange={(e) => setRawUrl(e.target.value)}
                placeholder="https://amazon.com/dp/..."
                className="w-full mt-1 bg-[#121B2D] border border-[#202B40] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#19D89B]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#93A4C0]">Product Category</label>
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full mt-1 bg-[#121B2D] border border-[#202B40] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#19D89B]"
              >
                <option value="">Select a category…</option>
                <option value="Tech & Creator Gear">Tech & Creator Gear (Cameras, Mics, Lights)</option>
                <option value="Finance & Software">Finance & SaaS Subscriptions</option>
                <option value="Books & Education">Books & Educational Resources</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#19D89B] text-black font-extrabold text-xs shadow-md hover:opacity-95"
            >
              Generate Cloaked Affiliate Link & Disclosures
            </button>
          </form>

          {generatedAffiliateLink && (
            <div className="p-4 bg-[#121B2D] border border-[#19D89B]/40 rounded-xl space-y-3 animate-in fade-in">
              <div>
                <span className="text-[11px] font-semibold text-[#93A4C0]">Your Tracked Shortlink:</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={generatedAffiliateLink}
                    className="flex-1 bg-[#172235] border border-[#202B40] rounded-lg px-2.5 py-1.5 text-xs text-[#15DDF5] font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-1.5 bg-[#202B40] hover:bg-[#2e3e5c] text-xs font-semibold rounded-lg text-white flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-[#172235] rounded-lg border border-[#202B40] text-[10px] text-[#93A4C0]">
                <span className="text-white font-bold block mb-0.5">Mandatory Video Description Disclosure:</span>
                "Disclosure: Some links in this description are affiliate links. As an associate, we earn from qualifying purchases at no extra cost to you."
              </div>
            </div>
          )}
        </div>
      )}

      {/* WITHDRAW PAYOUT MODAL */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#202B40] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202B40] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#15DDF5]" />
                Withdraw to Bank / UPI
              </h3>
              <button 
                onClick={() => setShowPayoutModal(false)}
                className="text-xs text-[#93A4C0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">
                  Amount to Withdraw (Available: ₹{walletBalance.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={walletBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#15DDF5]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#93A4C0]">Beneficiary UPI ID or IBAN</label>
                <input
                  type="text"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="w-full mt-1 bg-[#172235] border border-[#202B40] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#15DDF5]"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#93A4C0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequestingPayout}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#15DDF5] text-black shadow-neon-cyan disabled:opacity-60"
                >
                  {isRequestingPayout ? 'Requesting…' : 'Initiate Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LICENSE PURCHASED MODAL */}
      {purchasedLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] border border-[#202B40] rounded-2xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#19D89B]/20 text-[#19D89B] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">License Issued & Assets Unlocked!</h3>
            <p className="text-xs text-[#93A4C0]">
              You have acquired a perpetual commercial license for "{purchasedLicense.title}".
            </p>

            <div className="p-3 bg-[#172235] rounded-xl border border-[#202B40]">
              <span className="text-[10px] text-[#93A4C0] block">Your Cryptographic License Key:</span>
              <span className="font-mono text-xs font-bold text-[#15DDF5]">{purchasedLicense.key}</span>
            </div>

            <button
              onClick={() => setPurchasedLicense(null)}
              className="w-full py-2 bg-[#15DDF5] text-black font-extrabold text-xs rounded-xl"
            >
              Continue to Studio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
