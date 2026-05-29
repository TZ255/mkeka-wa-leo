import { LegalPage } from '../components/LegalPage';

const sections = [
  {
    title: 'Information we collect',
    body: ['We collect only the information needed to run and improve Mkeka wa Leo, including your account profile, contact details you provide, device or app usage data, and service activity.'],
    items: ['We do not collect betting platform passwords.', 'We do not collect card numbers inside this app.', 'Payment processing may be handled by trusted third-party services.'],
  },
  {
    title: 'How we use information',
    body: ['We use information to provide betting tips, manage VIP access, improve performance, respond to support requests, send service updates where appropriate, and protect the app from misuse or fraud.'],
  },
  {
    title: 'Sharing information',
    body: ['We do not sell personal information. Some non-personal analytics or service data may be processed through tools such as Google services, Meta platforms, payment providers, or sports data services so the product can operate and improve.'],
  },
  {
    title: 'Storage and security',
    body: ['We use reasonable security practices to protect account data against unauthorized access, loss, misuse, or deletion. Access to systems is limited to authorized people and services.'],
  },
  {
    title: 'Marketing communication',
    body: ['We may send updates about VIP tips, odds, offers, or sports content. You can opt out by contacting us or using unsubscribe options where available.'],
  },
  {
    title: 'Children',
    body: ['Mkeka wa Leo is not for children under 18. If a parent or guardian believes a child gave us personal information, contact us so we can remove it.'],
  },
  {
    title: 'Your rights',
    body: ['You can request access to your information, ask for corrections, ask for account deletion, object to some marketing use, or contact us about privacy concerns. Reach us at admin@mkekawaleo.com.'],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      subtitle="How Mkeka wa Leo handles account, app, and service information."
      updated="8 Oct 2025"
      sections={sections}
    />
  );
}
