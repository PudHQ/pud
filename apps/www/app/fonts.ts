import localFont from "next/font/local";

// Version 4.007 retains the grade axis used in the original wordmark.
export const wordmark = localFont({
  src: "./fonts/google-sans-flex-4.007-wordmark.woff2",
  weight: "1 1000",
  display: "swap",
});

export const display = localFont({
  src: "./fonts/google-sans-flex-4.007-display.woff2",
  weight: "865",
  display: "swap",
});
