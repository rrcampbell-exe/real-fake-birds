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
          Last updated: October 23, 2026
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-7 text-[var(--color-text)]">
        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Overview
          </h2>
          <p>
            Real Fake Birds is a bird guessing game operated by Catbird Games.
            This policy explains what information we collect, why we collect it, and how it is used.
            We aim to collect as little data as possible and do not sell your information.
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
            <strong>Profile and social information.</strong> Account profiles include your username,
            avatar selection, and public or private profile setting. We store follow relationships and
            request status, blocks, and profile reports. A report includes the reporting and reported
            accounts, a reason, and any optional note you submit.
          </p>
          <p>
            <strong>Gameplay progress.</strong> Birds you have identified, seeds you have earned,
            your daily and longest streak, daily challenge history, unlocked themes, milestones reached,
            your bird journal, and your birdhouse collection are stored in our database so your progress
            is preserved when you sign in from a new device.
          </p>
          <p>
            <strong>Guest progress. </strong> On the web, you can play without an account and guest
            progress is stored in your browser&apos;s local storage. If you clear that storage, the local
            progress may be lost. In the iOS and Android apps, signed-out players are prompted to sign
            in or create an account while online; guest play is available when offline. Offline guest
            progress is stored locally on the device and is not account-synced while you remain signed out.
          </p>
          <p>
            <strong>PostHog analytics. </strong> When enabled, PostHog receives product events that
            the app sends, such as gameplay actions and feature use. We disable PostHog&apos;s automatic
            interaction capture and automatic pageview/page-exit capture. For signed-in players, we
            identify events using your username; we do not send your email address to PostHog. PostHog
            persistence is configured to use local storage and cookies. PostHog may also infer
            approximate location, such as city or country, from the IP address used to make a request.
            This analytics is not anonymous for signed-in players.
          </p>
          <p>
            Where our region check requires a choice (including the EU and cases where region is
            unknown), the analytics prompt offers &ldquo;Allow analytics&rdquo; and &ldquo;No thanks.&rdquo; The
            choice is saved in local storage. In regions identified as not requiring consent, PostHog
            consent is accepted automatically. Do Not Track is not used to set this choice, and there
            is currently no separate analytics toggle in Settings. The web app also includes Vercel
            Analytics; it is separate from the PostHog prompt and is not gated by that choice.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Profile Visibility
          </h2>
          <p>
            Profiles are public by default. Public profiles can be viewed by guests and other players;
            they show the username, avatar, join month and year, gameplay statistics, and follower and
            following counts. Approved followers can view the full profile of a private account.
            Visitors who are not approved followers still see limited details such as the username
            and join month and year; gameplay statistics and connection lists are restricted. The
            restricted profile response also includes follower and following totals, although the
            profile page does not display those totals for private profiles.
          </p>
          <p>
            Public profiles can show follower and following lists. You can follow public profiles
            immediately; following a private profile sends a request that its owner can approve or
            deny. Blocking limits profile visibility and prevents social actions between the
            accounts. We store these relationships to provide these features.
          </p>
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
            You can delete your account from the{' '}
            <Link
              href="/settings"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              Settings
            </Link>{' '}
            page. The deletion flow deletes your Supabase Auth account; database records linked to
            that account are configured to be deleted where the database relationships provide for
            it. This flow does not send a separate deletion request to PostHog, and PostHog&apos;s
            retention of analytics data is governed by its own policies.
          </p>
          <p>
            Web guest progress is stored in your browser&apos;s local storage and may be removed by
            clearing that storage. Offline guest progress in the native apps is stored locally on
            the device; this policy does not make a claim about what the operating system retains
            or removes when an app is uninstalled.
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
