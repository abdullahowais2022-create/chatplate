import { LegalPage, legalContact } from "@/components/legal/legal-page";

export const metadata = { title: "Privacy policy", robots: { index: true, follow: true } };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const contact = legalContact();
  return (
    <LegalPage title="Privacy policy" updated="24 November 2026">
      <p>TillText is software that local businesses (restaurants, shops, pharmacies and others) use to take orders and answer customers on WhatsApp with the help of an AI assistant. This policy explains what information TillText handles, why, and the choices you have.</p>
      <p>When you message a business that uses TillText, that business decides how your information is used, and TillText processes it on the business&apos;s behalf. When a business owner or staff member uses TillText, TillText is responsible for their account information.</p>

      <h2>Information we handle</h2>
      <ul>
        <li><b>Customers who message a business:</b> WhatsApp phone number and profile name, the messages, voice notes, locations and button choices you send, the business&apos;s replies, order details (items, delivery or pickup, address, requested time, payment preference) and the language you write in.</li>
        <li><b>Business users:</b> name, email address, password (stored only as a secure hash), role, the business&apos;s settings, products and prices, and a log of important actions for security.</li>
        <li><b>Technical data:</b> IP address and browser details for sign-in security and rate limiting.</li>
      </ul>
      <p>TillText never asks for, collects or stores card numbers or other payment details. Customers pay the business directly.</p>

      <h2>How the information is used</h2>
      <ul>
        <li>To understand messages (including transcribing voice notes and translating languages), reply, and create and update orders.</li>
        <li>To show the business its orders, conversations and customers, and to let staff take over a chat.</li>
        <li>To keep the service secure, prevent abuse and fix problems.</li>
      </ul>
      <p>TillText does not sell personal information and does not use it for advertising.</p>

      <h2>Service providers</h2>
      <p>TillText relies on these providers, who process data only to provide their service:</p>
      <ul>
        <li><b>Meta (WhatsApp Business Platform)</b> to send and receive WhatsApp messages.</li>
        <li><b>OpenAI</b> to understand and write messages, transcribe voice notes and translate. Under OpenAI&apos;s API terms, data sent through the API is not used to train their models by default.</li>
        <li><b>Vercel</b> (hosting) and <b>Neon</b> (database). Optionally Upstash (queues and rate limits), Supabase (file storage) and Resend (email notifications) when the operator enables them.</li>
      </ul>

      <h2>Security</h2>
      <p>Phone numbers and WhatsApp access tokens are encrypted (AES-256-GCM). Passwords are hashed with bcrypt. Each business can only access its own data, and access within a business is limited by role (owner, manager, staff).</p>

      <h2>How long information is kept</h2>
      <p>Conversations, orders and customer records are kept while the business keeps its TillText account, so it can see order history, unless the business deletes them sooner or you ask for deletion as described below. Security logs are kept for a limited time.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Ask the business you ordered from to see, correct or delete your information. You can also ask us directly{contact ? <> at <a href={`mailto:${contact}`}>{contact}</a></> : ""}; see <a href="/data-deletion">data deletion</a>.</li>
        <li>Type HUMAN in the chat at any time to talk to a person instead of the AI.</li>
        <li>Stop messaging the business, or block the number in WhatsApp, to stop all processing of new messages.</li>
      </ul>
      <p>Depending on where you live (for example under the GDPR or UK GDPR), you may also have the right to object, restrict processing, data portability and to complain to your data protection authority.</p>

      <h2>Children</h2>
      <p>TillText is not intended for children under 13, and business accounts are for adults only.</p>

      <h2>Changes</h2>
      <p>We will update this page if the way we handle information changes, and change the date above.</p>
    </LegalPage>
  );
}
