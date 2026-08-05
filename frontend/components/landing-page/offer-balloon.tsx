'use client';

/**
 * The floating offer badge on the homepage.
 *
 * Advertising only — it links to signup and decides nothing. The backend
 * still rules on who actually gets the six months, so a stale build here
 * costs a misleading balloon, never a free subscription.
 *
 * It appears once the visitor has scrolled past the hero rather than on
 * load, so it does not compete with the hero while the page is settling and
 * only shows to someone who has started reading.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { offerIsOpen } from '@/lib/offer';

const DISMISSED_KEY = 'offer-balloon-dismissed';

/** How far down the page the balloon waits, as a fraction of the viewport. */
const REVEAL_AT = 0.6;

export default function OfferBalloon() {
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  // Starts hidden. localStorage cannot be read on the server, so this keeps
  // the server render and the first client render identical, and the effect
  // below un-hides it once we actually know.
  const [dismissed, setDismissed] = useState(true);
  const reduceMotion = useReducedMotion();

  const offerOpen = offerIsOpen();

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISSED_KEY) === 'true');
    } catch {
      // Private mode with storage disabled: show it, just don't remember.
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!offerOpen) return;
    const onScroll = () =>
      setScrolledPastHero(window.scrollY > window.innerHeight * REVEAL_AT);
    onScroll(); // catch a reload that restores a scrolled position
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offerOpen]);

  if (!offerOpen) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Nothing to do — it will come back next visit.
    }
  };

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 };

  return (
    <AnimatePresence>
      {scrolledPastHero && !dismissed && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 w-[90px] md:w-[140px]"
          initial={hidden}
          animate={{ opacity: 1, y: 0 }}
          exit={hidden}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss this offer"
            className="absolute -top-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition hover:bg-gray-50 hover:text-gray-800 md:h-7 md:w-7"
          >
            <span aria-hidden className="text-base leading-none">
              &times;
            </span>
          </button>

          <Link
            href="/nursery-signup"
            className="block transition-transform duration-300 hover:scale-105"
          >
            <Image
              src="/images/offer-balloon.png"
              alt="First 6 months free — sign up your nursery"
              width={336}
              height={543}
              className="h-auto w-full drop-shadow-xl"
            />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
