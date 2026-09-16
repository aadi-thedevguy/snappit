import Link from "next/link";
import { Globe2, Mail, Twitter } from "lucide-react";

const navigationLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const contactLinks = [
  {
    label: "aadi@adityakhare.com",
    href: "mailto:aadi@adityakhare.com",
    icon: Mail,
    external: false,
  },
  {
    label: "adityakhare.com",
    href: "https://adityakhare.com",
    icon: Globe2,
    external: true,
  },
  {
    label: "@Aadi__khare",
    href: "https://x.com/Aadi__khare",
    icon: Twitter,
    external: true,
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/60">
      <div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm space-y-2">
          <Link
            href="/"
            className="inline-flex font-display text-lg font-bold text-foreground transition-colors hover:text-sky-100"
          >
            Snappit
          </Link>
          <p className="text-sm leading-6 text-muted-foreground">
            Record, manage, and share polished product demos with ease.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Snappit. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {contactLinks.map(({ label, href, icon: Icon, external }) => (
              <a
                key={href}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="group inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-100/50 hover:bg-sky-100/10 hover:text-sky-100 hover:shadow-sm"
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
