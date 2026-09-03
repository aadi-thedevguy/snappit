type LegalSection = {
  title: string;
  content: React.ReactNode;
};

type Props = {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

const LegalPage = ({ title, description, updatedAt, sections }: Props) => {
  return (
    <main className="container mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <header className="mb-10 border-b border-border pb-8">
        <p className="mb-3 text-sm font-medium text-sky-100">Legal</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
          {description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated: {updatedAt}
        </p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {section.title}
            </h2>
            <div className="text-sm leading-7 text-muted-foreground">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default LegalPage;
