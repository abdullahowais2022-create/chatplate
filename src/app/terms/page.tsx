import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Terms of service", robots: { index: true, follow: true } };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="24 November 2026">
      <p>These terms apply to businesses and their staff who use TillText to take orders on WhatsApp.</p>
      <h2>Your account</h2>
      <ul>
        <li>You must be an adult and authorised to act for the business you register.</li>
        <li>Keep your password private. You are responsible for what happens under your account and for the staff accounts you create.</li>
      </ul>
      <h2>Using WhatsApp</h2>
      <ul>
        <li>You connect your own WhatsApp Business number and must follow Meta&apos;s WhatsApp Business terms and Business Messaging policies, including only messaging people who contacted you or agreed to hear from you.</li>
        <li>Meta may charge you directly for some WhatsApp messages.</li>
      </ul>
      <h2>Your content and the AI</h2>
      <ul>
        <li>You are responsible for your products, prices, opening hours and other information you enter. The AI only offers what you set up, but you should check orders before fulfilling them.</li>
        <li>The AI can make mistakes. Allergy, medical and other sensitive questions are passed to your staff; do not rely on the AI for them.</li>
        <li>TillText does not process payments. Customers pay you directly, and you are responsible for your sales, taxes and refunds.</li>
      </ul>
      <h2>Acceptable use</h2>
      <p>Do not use TillText for spam, illegal products or services, harassment, or to collect payment card details. We may suspend accounts that do.</p>
      <h2>Availability and liability</h2>
      <p>TillText is provided as is. We work to keep it available and secure but cannot guarantee it will be uninterrupted or error-free. To the extent the law allows, we are not liable for indirect losses or lost profits.</p>
      <h2>Ending</h2>
      <p>You can stop using TillText at any time. Ask us to delete your business data as described on the <a href="/data-deletion">data deletion</a> page.</p>
    </LegalPage>
  );
}
