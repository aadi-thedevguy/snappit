"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SignIn = () => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
    });
    console.log("error: ", error);
    if (error) {
      toast.error(error.message || error.statusText || "Sign in failed");
      setLoading(false);
      return;
    }
    setLoading(false);
  };
  return (
    <main className="w-full min-h-screen flex flex-col-reverse lg:flex-row justify-between overflow-hidden max-lg:gap-10">
      <aside className="bg-light-100 lg:w-1/2 flex flex-col justify-between lg:h-screen w-full py-10 px-6 lg:pl-10 gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/assets/icons/logo.svg"
            alt="SnapChat Logo"
            width={32}
            height={32}
          />
          <h1 className="text-xl font-black text-blue-100 font-satoshi -tracking-[0.5px]">
            Snappit
          </h1>
        </Link>

        <div className="flex items-center justify-center">
          <section className="flex flex-col items-center justify-center gap-8 px-6 sm:px-8 w-full max-w-2xl">
            <figure className="flex items-center gap-1 justify-center">
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
            <p className="text-3xl font-semibold text-dark-100 text-center -tracking-[2px]">
              Snappit makes screen recording easy. From quick walkthroughs to
              full presentations, it&apos;s fast, smooth, and shareable in
              seconds
            </p>
            <article className="lex flex-col gap-2.5 items-center">
              <div className="flex flex-col items-center gap-1">
                <p className="text-base font-bold text-dark-100">
                  Made with ❤️ by
                </p>
                <Image
                  src="/assets/images/avatar1.webp"
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
        <p className="text-sm font-medium text-gray-500">
          © Snappit {new Date().getFullYear()}
        </p>
      </aside>
      <aside className="flex items-center justify-center lg:w-1/2 w-full lg:h-screen px-10 py-10">
        <Card className="shadow-xl max-w-xl w-full px-5 py-6">
          <CardHeader className="text-center">
            <CardTitle className="font-display mb-8 text-2xl">
              <Link
                href="/"
                className="flex items-center gap-2.5 justify-center"
              >
                <Image
                  src="/assets/icons/logo.svg"
                  alt="SnapChat Logo"
                  width={40}
                  height={40}
                />
                <h1 className="text-28 font-black text-blue-100 font-satoshi">
                  Snappit
                </h1>
              </Link>
            </CardTitle>
            <CardDescription className="text-3xl mb-8 font-bold text-dark-100 text-center -tracking-[2px]">
              Create and share your very first{" "}
              <span className="text-sky-100">Snappit video</span> in no time!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSignIn}
              disabled={loading}
              variant="outline"
              size="lg"
              className="w-full gap-3 h-12 rounded-full text-base"
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
            </Button>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
};

export default SignIn;
