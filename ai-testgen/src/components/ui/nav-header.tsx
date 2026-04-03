"use client"; 

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * NavHeader: A professional glassmorphic navigation bar with a tracking magnetic cursor.
 * Adapted for TestPilot AI with Framer Motion.
 */
function NavHeader({ className }: { className?: string }) {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  return (
    <ul
      className={cn(
        "relative mx-auto flex w-fit rounded-full border border-white/10 bg-white/5 backdrop-blur-xl p-1 shadow-2xl shadow-black/40",
        className
      )}
      onMouseLeave={() => setPosition((pv) => ({ ...pv, opacity: 0 }))}
    >
      <Tab setPosition={setPosition} href="#">Home</Tab>
      <Tab setPosition={setPosition} href="#features">Features</Tab>
      <Tab setPosition={setPosition} href="#pricing">Pricing</Tab>
      <Tab setPosition={setPosition} href="#enterprise">Enterprise</Tab>

      <Cursor position={position} />
    </ul>
  );
}

const Tab = ({
  children,
  setPosition,
  href
}: {
  children: React.ReactNode;
  setPosition: any;
  href: string;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  
  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;

        const { width } = ref.current.getBoundingClientRect();
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        });
      }}
      className="relative z-10 block cursor-pointer transition-colors"
    >
      <a 
        href={href} 
        className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors md:px-6 md:py-2.5 md:text-xs"
      >
        {children}
      </a>
    </li>
  );
};

const Cursor = ({ position }: { position: any }) => {
  return (
    <motion.li
      animate={position}
      className="absolute z-0 h-8 rounded-full bg-primary md:h-9 top-1/2 -translate-y-1/2"
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    />
  );
};

export default NavHeader;
