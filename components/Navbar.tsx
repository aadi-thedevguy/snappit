"use client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { LogOutIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import Image from "next/image";

const Navbar = () => {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const signOut = async () => {
    return await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          redirect("/sign-in");
        },
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg gradient-primary">
            <Image
              src="/assets/icons/logo.svg"
              alt="Snappit Logo"
              width={32}
              height={32}
            />
          </div>
          <span className="text-lg font-display font-bold text-foreground">
            Snappit
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-gray-100 text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                    <AvatarImage
                      src={user?.image || "/assets/images/avatar.webp"}
                    />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="text-gray-100 text-xs" disabled>
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-sky-100">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                U
              </AvatarFallback>
              <AvatarImage src="/assets/images/avatar.webp" />
            </Avatar>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
