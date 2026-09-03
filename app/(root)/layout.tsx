import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
};

export default RootLayout;
