
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-tr from-gray-100 to-sky-100 text-gray-900 font-sans px-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>
          <h1 className="text-2xl font-bold mb-2">
            404 Not Found
          </h1>
        </AlertTitle>
        <AlertDescription>
          <p className="mb-4 text-gray-700">
            The page you are looking for does not exist.
          </p>
          <Link
            href="/"
            className={buttonVariants({ variant: "link" })}
          >
            Go to Home
            <ArrowRightIcon className="ml-1" />
          </Link>
        </AlertDescription>
      </Alert>
    </div>
  );
};