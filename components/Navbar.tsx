"use client";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import ImageWithFallback from "./ImageWithFallback";
import { LogOutIcon } from "lucide-react";
const Navbar = () => {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <header className="navbar">
      <nav>
        <Link href="/">
          <Image
            src="/assets/icons/logo.svg"
            alt="SnapChat Logo"
            width={32}
            height={32}
          />
          <h1>Snappit</h1>
        </Link>

        {user && (
          <figure>
            <ImageWithFallback
              src={session?.user.image ?? ""}
              alt="User"
              width={36}
              height={36}
              className="rounded-full aspect-square"
            />
            <button
              onClick={async () => {
                return await authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      redirect("/sign-in");
                    },
                  },
                });
              }}
              className="cursor-pointer"
            >
              <LogOutIcon className="w-5 h-5 text-sky-500" />
            </button>
          </figure>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
