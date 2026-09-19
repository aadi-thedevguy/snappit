import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | Snappit",
  description: "The terms that apply when you use Snappit.",
};

const TermsPage = () => (
  <LegalPage
    title="Terms of Service"
    description="These terms set the basic rules for using Snappit. By using the service, you agree to them."
    updatedAt="September 3, 2026"
    sections={[
      {
        title: "Using Snappit",
        content: (
          <p>
            You must provide accurate account information, keep your account secure, and use Snappit
            only for lawful purposes. Do not disrupt the service or upload content that infringes
            another person&apos;s rights.
          </p>
        ),
      },
      {
        title: "Your content",
        content: (
          <p>
            You retain ownership of your recordings. You grant Snappit the limited permission needed
            to store, process, play, and share them as directed by you.
          </p>
        ),
      },
      {
        title: "Availability and retention",
        content: (
          <p>
            Snappit is provided on an as-available basis and may change or be interrupted.
            Recordings are generally retained for up to one month, so download anything you need to
            keep.
          </p>
        ),
      },
      {
        title: "Responsibility and changes",
        content: (
          <p>
            To the extent permitted by law, Snappit is provided without warranties and is not liable
            for indirect or consequential losses. We may update these terms as the service evolves.
            Questions can be sent through{" "}
            <a
              href="https://adityakhare.com"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-sky-100"
            >
              adityakhare.com
            </a>
            .
          </p>
        ),
      },
    ]}
  />
);

export default TermsPage;
