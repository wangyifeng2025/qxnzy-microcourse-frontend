import { Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .community-shell h1,
            .community-shell h2,
            .community-shell h3,
            .community-shell .font-community-display {
              font-family: ${manrope.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
            }
          `,
        }}
      />
      <div
        className={cn(inter.className, "community-shell min-h-screen bg-[#f9f9fc] text-[#1a1c1e] antialiased")}
      >
        {children}
      </div>
    </>
  );
}
