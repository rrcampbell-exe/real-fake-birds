import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Real Fake Birds',
  description: 'The terms governing your use of Real Fake Birds.',
};

export default function TermsOfServicePage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-2">
          Legal
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Last updated: October 23, 2026
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-7 text-[var(--color-text)]">
        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Acceptance
          </h2>
          <p>
            By accessing or using Real Fake Birds, you agree to be bound by these Terms of Service.
            If you do not agree, please discontinue use of the game. These terms apply to all
            visitors, players, and registered account holders.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Eligibility
          </h2>
          <p>
            You must be at least 13 years old to use Real Fake Birds or create an account.
            By using the game you represent that you meet this requirement.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activity that occurs under your account. You must provide accurate
            information when creating an account and keep it up to date.
          </p>
          <p>
            You may not create an account on behalf of another person or use another person&apos;s
            account without their consent.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Acceptable Use
          </h2>
          <p>You agree not to:</p>
          <ul className="flex flex-col gap-1.5 pl-5 list-disc marker:text-[var(--color-muted)]">
            <li>
              Abuse, overload, or perform automated requests against our servers or API endpoints
              beyond normal gameplay use
            </li>
            <li>
              Scrape, harvest, or systematically extract game content, bird data, or user data
            </li>
            <li>
              Attempt to reverse-engineer, decompile, or bypass any security or access controls
            </li>
            <li>
              Use the game to distribute spam, malware, or any harmful content
            </li>
            <li>
              Impersonate another user or choose a username that misrepresents your identity
            </li>
            <li>
              Exploit bugs or vulnerabilities for competitive advantage; please report them instead
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Intellectual Property
          </h2>
          <p>
            The Real Fake Birds name, branding, source code, and original assets are owned by
            Catbird Games and are protected by applicable intellectual property
            laws. You may not reproduce or redistribute any part of the game without prior written
            permission.
          </p>
          <p>
            Real bird images are sourced from Wikimedia Commons and are used in accordance with
            their respective licenses (Creative Commons or public domain). Attribution information
            is displayed in-game alongside each real bird.
          </p>
          <p>
            Fake bird images in the game are generated using AI image models and are subject to the
            usage policies of the respective model providers (including OpenAI). These images
            are provided for in-game use only and may not be extracted or used for other purposes.
          </p>
          <p>
            Theme music and some visual assets were created in collaboration with ElevenLabs and is subject to ElevenLabs&apos;
            terms of service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            User-Generated Content
          </h2>
          <p>
            You are responsible for the username, avatar, and other information you choose to add to
            your profile. You allow us to display your username and profile information in the game
            as needed to provide profile, leaderboard, and social features. Your profile visibility
            setting controls which profile details other players can see, as described in our{' '}
            <Link
              href="/privacy"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Profiles and Social Features
          </h2>
          <p>
            Profiles are public by default. A public profile can be viewed by guests and other
            players and includes your username, avatar, join month and year, gameplay statistics,
            and follower and following counts. You can make your profile private in Settings. For
            private profiles, unapproved viewers cannot see gameplay statistics or connection lists;
            approved followers can see the full profile. The profile page may still display limited
            details, such as username and join month and year, to unapproved viewers.
          </p>
          <p>
            Following a public profile takes effect immediately. Following a private profile sends
            a request that the profile owner may approve or deny. You may block other accounts;
            blocking limits profile access and social interactions between the accounts. You may
            also submit a report about another profile with a reason and optional note.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate any account at our sole discretion —
            including for violation of these Terms — without notice. You may delete your account
            at any time from the{' '}
            <Link
              href="/settings"
              className="underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
            >
              Settings
            </Link>{' '}
            page.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Disclaimer of Warranties
          </h2>
          <p>
            Real Fake Birds is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
            kind, either express or implied, including but not limited to warranties of
            merchantability, fitness for a particular purpose, or non-infringement. We do not
            warrant that the game will be uninterrupted, error-free, or free of harmful components.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, neither Catbird Games nor its owners, officers,
            nor representatives shall be liable for any indirect, incidental, special, consequential, or punitive damages
            arising from your use of or inability to use Real Fake Birds, even if advised of
            the possibility of such damages. Our total liability to you for any claim arising
            out of these Terms or your use of the game shall not exceed the amount you paid us
            in the twelve months preceding the claim (which, since the game is free, is $0).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of the State of Wisconsin, without regard to
            conflict of law provisions. Any disputes shall be resolved in the courts of Wisconsin.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Changes to These Terms
          </h2>
          <p>
            We may update these Terms from time to time. When we do, the &ldquo;Last updated&rdquo; date at
            the top of this page will change. Continued use of the game after changes constitutes
            your acceptance of the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Contact
          </h2>
          <p>
            Questions about these Terms? Contact us at{' '}
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
          href="/privacy"
          className="text-sm text-[var(--color-muted)] underline decoration-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-secondary)]"
        >
          ← Privacy Policy
        </Link>
      </div>
    </div>
  );
}
