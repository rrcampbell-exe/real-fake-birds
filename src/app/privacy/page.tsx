import type { Metadata } from 'next';
import Link from 'next/link';
import ExternalLink from '@/components/native/ExternalLink';

export const metadata: Metadata = {
  title: 'Privacy Policy — Real Fake Birds',
  description: 'How Real Fake Birds collects, uses, and protects your information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
          Legal
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Last updated: April 23, 2026
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-7 text-[var(--color-text)]">
        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Overview
          </h2>
          <p>
            Real Fake Birds is a bird guessing game operated by Catbird Games (Ryan R. Campbell).
            This policy explains what information we collect, why we collect it, and how it is used.
            We are committed to collecting as little data as possible and never selling your information.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Information We Collect
          </h2>
          <p>
            <strong>Account information.</strong> If you create an account, we store your username,
            a canonicalized version of your username, and the email address you registered with, if any.
            Passwords are hashed and managed exclusively by Supabase Auth — we never store raw passwords.
          </p>
          <p>
            <strong>Gameplay progress.</strong> Birds you have identified, seeds you have earned,
            your daily and longest streak, daily challenge history, unlocked themes, milestones reached,
            your bird journal, and your birdhouse collection are stored in our database so your progress
            is preserved when you sign in from a new device.
          </p>
          <p>
            <strong>Local storage. </strong> If you play without an account, the same gameplay data
            is stored only in your browser&apos;s local storage on your device. It is never transmitted to
            our servers unless you later create an account and choose to sync.
          </p>
          <p>
            <strong>Analytics. </strong> We use PostHog to collect anonymized, aggregate product
            analytics — for example, which game actions are taken, screen transitions, and
            feature engagement. If you are signed in, your username is sent to PostHog to
            associate events with your account; your email address is never sent. PostHog also
            collects approximate location data (city/country level) derived from your IP address.
            You can opt out via your browser&apos;s &ldquo;Do Not Track&rdquo; setting or by using a tracker-blocking
            extension.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Information We Do Not Collect
          </h2>
          <ul className="flex flex-col gap-1.5 pl-5 list-disc marker:text-[var(--color-muted)]">
            <li>Precise GPS or fine-grained location coordinates</li>
            <li>Contact list, microphone, or camera access</li>
            <li>Advertising identifiers or cross-site tracking cookies</li>
            <li>Financial or payment information (we process no purchases)</li>
            <li>Browsing history outside of this application</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            How We Use Your Information
          </h2>
          <p>
            Account and gameplay data is used solely to provide the service — syncing your progress,
            displaying leaderboard standings, and restoring your collection across sessions.
            Analytics data is used to improve the game experience and understand which features
            are most useful.
          </p>
          <p>
            We do not use your data for targeted advertising, sell it to third parties, or share it
            with any party except as described in the Third-Party Services section below.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Third-Party Services
          </h2>
          <p>
            <strong>Supabase.</strong> Database hosting and authentication. Your account credentials
            and gameplay progress are stored in Supabase infrastructure. See{' '}
            <ExternalLink
              href="https://supabase.com/privacy"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              supabase.com/privacy
            </ExternalLink>
            .
          </p>
          <p>
            <strong>PostHog.</strong> Product analytics. Usernames (for signed-in players) and
            approximate location data are transmitted to PostHog. Email addresses are not.
            See{' '}
            <ExternalLink
              href="https://posthog.com/privacy"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              posthog.com/privacy
            </ExternalLink>
            .
          </p>
          <p>
            <strong>Vercel.</strong> Web hosting and edge delivery. See{' '}
            <ExternalLink
              href="https://vercel.com/legal/privacy-policy"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              vercel.com/legal/privacy-policy
            </ExternalLink>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Data Retention
          </h2>
          <p>
            Your account and associated data is retained for as long as your account exists.
            You may request deletion at any time from the{' '}
            <Link
              href="/settings"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              Settings
            </Link>{' '}
            page or by contacting us directly. Upon account deletion, all data associated with
            your account — including profile, progress, journal, and leaderboard history — is
            permanently removed from our database.
          </p>
          <p>
            Local-only gameplay data (for players without accounts) resides exclusively in your
            browser and can be cleared at any time by clearing your browser&apos;s local storage.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Children&apos;s Privacy
          </h2>
          <p>
            Real Fake Birds is not directed at children under 13 years of age.
            We do not knowingly collect personal information from children under 13.
            If you believe a child under 13 has provided us with personal information,
            please contact us at the address below and we will delete it promptly.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Your Rights
          </h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, or delete the
            personal data we hold about you. To exercise any of these rights, contact us at the
            address below. We will respond within 30 days.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, the &ldquo;Last updated&rdquo;
            date at the top of this page will change. Continued use of the game after changes
            constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Contact
          </h2>
          <p>
            Questions about this Privacy Policy or your data? Contact us at{' '}
            <a
              href="mailto:campbell.ryan.r@gmail.com"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              campbell.ryan.r@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-[var(--color-surface-border)]">
        <Link
          href="/terms"
          className="text-sm text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
        >
          Terms of Service →
        </Link>
      </div>
    </div>
  );
}
