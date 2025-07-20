"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const SignIn = () => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
  };
  return (
    <main className="sign-in">
      <aside className="testimonial">
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="SnapChat Logo"
            width={32}
            height={32}
          />
          <h1>Snappit</h1>
        </Link>

        <div className="description">
          <section>
            <figure>
              {Array.from({ length: 5 }).map((_, index) => (
                <Image
                  src="/assets/icons/star.svg"
                  alt="Star Icon"
                  width={20}
                  height={20}
                  key={index}
                />
              ))}
            </figure>
            <p>
              Snappit makes screen recording easy. From quick walkthroughs to
              full presentations, it&apos;s fast, smooth, and shareable in
              seconds
            </p>
            <article>
              <div>
                <p>Made with ❤️ by</p>
                <Image
                  src="https://www.thedevguy.in/images/avatar1.webp"
                  alt="Aditya"
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <h2>
                  <a
                    href="https://x.com/Aadi__khare"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    @aadi_thedevguy
                  </a>
                </h2>
              </div>
            </article>
          </section>
        </div>
        <p>© Snappit 2025</p>
      </aside>
      <aside className="google-sign-in">
        <section>
          <Link href="/">
            <Image
              src="/assets/icons/logo.svg"
              alt="SnapChat Logo"
              width={40}
              height={40}
            />
            <h1>Snappit</h1>
          </Link>
          <p>
            Create and share your very first <span>Snappit video</span> in no
            time!
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Image
                src="/assets/icons/google.svg"
                alt="Google Icon"
                width={22}
                height={22}
              />
            )}
            <span>Sign in with Google</span>
          </button>
        </section>
      </aside>
      <div className="overlay" />
    </main>
  );
};

export default SignIn;
