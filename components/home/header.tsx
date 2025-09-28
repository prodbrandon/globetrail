import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export const Header = () => {
  return (
    <div className="fixed z-50 pt-8 md:pt-14 top-0 left-0 w-full">
      <header className="container">
        <div className="flex items-center justify-between">
          {/* Empty space for balance */}
          <div className="max-lg:hidden"></div>

          {/* Navigation in the center with glassmorphic container */}
          <div className="max-lg:hidden absolute left-1/2 transform -translate-x-1/2">
            <div className="relative backdrop-blur-md bg-black/30 rounded-full border border-white/20 px-6 py-3 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full opacity-70"></div>
              <nav className="relative flex items-center justify-center gap-x-8 font-mono">
                <Link
                  className="font-medium text-blue-100/80 hover:text-white duration-200 transition-colors ease-out px-3 py-1 rounded-md hover:bg-white/10"
                  href="https://devpost.com/software/globetrail-bfcw7p"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  DevPost
                </Link>

                {/* Logo in the center */}
                <Link href="/" className="flex items-center mx-4">
                  <Logo />
                </Link>

                <Link
                  className="font-medium text-blue-100/80 hover:text-white duration-200 transition-colors ease-out px-3 py-1 rounded-md hover:bg-white/10"
                  href="https://github.com/prodbrandon/globetrail"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </Link>
              </nav>
            </div>
          </div>

          {/* Mobile menu and mobile logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="lg:hidden flex items-center">
              <Logo />
            </Link>
            <MobileMenu />
          </div>
        </div>
      </header>
    </div>
  );
};
