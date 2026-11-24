import { LegalPage, legalContact } from "@/components/legal/legal-page";

export const metadata = { title: "Data deletion", robots: { index: true, follow: true } };
export const dynamic = "force-dynamic";

export default function DataDeletionPage() {
  const contact = legalContact();
  return (
    <LegalPage title="Delete your data" updated="24 November 2026">
      <h2>If you messaged a business on WhatsApp</h2>
      <ol className="ml-5 list-decimal space-y-1.5">
        <li>Ask the business directly in the same WhatsApp chat, for example: &quot;Please delete my data&quot;. Staff can delete your customer record, conversation and order history from their dashboard.</li>
        <li>Or email us{contact ? <> at <a href={`mailto:${contact}`}>{contact}</a></> : ""} with the business name and the phone number you messaged from. We will confirm and complete the deletion within 30 days.</li>
      </ol>
      <h2>If you have a business account</h2>
      <p>The account owner can remove staff members in Settings → Team. To delete the whole business account and all its data, email us{contact ? <> at <a href={`mailto:${contact}`}>{contact}</a></> : ""} from the owner&apos;s email address. We will confirm and delete it within 30 days.</p>
      <h2>Facebook / WhatsApp connection</h2>
      <p>Disconnecting WhatsApp in Settings → WhatsApp removes the stored access token immediately. You can also remove TillText&apos;s access in your Meta Business settings under Integrations.</p>
    </LegalPage>
  );
}
