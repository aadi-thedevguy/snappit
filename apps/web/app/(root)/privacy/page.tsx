import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Snappit",
  description: "How Snappit collects, uses, and protects your information.",
};

const PrivacyPage = () => (
  <LegalPage
    title="Privacy Policy"
    description="This policy explains the limited information Snappit handles when you use the service."
    updatedAt="September 3, 2026"
    sections={[
      {
        title: "Information we collect",
        content: (
          <p>
            We process your account details, uploaded recordings and metadata, and basic usage or
            security logs needed to operate Snappit.
          </p>
        ),
      },
      {
        title: "How we use information",
        content: (
          <p>
            We use this information to provide, secure, maintain, and improve the service. We do not
            sell your personal information.
          </p>
        ),
      },
      {
        title: "Storage and sharing",
        content: (
          <p>
            Recordings are stored with our cloud providers and are generally retained for up to one
            month. Public share links can be viewed by anyone who has the link. We only share data
            with service providers or when required by law.
          </p>
        ),
      },
      {
        title: "Your choices",
        content: (
          <p>
            You can delete your recordings from Snappit. For privacy questions or account requests,
            contact us through{" "}
            <a
              href="mailto:aadi@adityakhare.com"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-sky-100"
            >
              aadi@adityakhare.com
            </a>
            .
          </p>
        ),
      },
    ]}
  />
);

export default PrivacyPage;
