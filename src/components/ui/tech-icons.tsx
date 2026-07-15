import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function NextJsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M11.5 2.5a9.5 9.5 0 1 0 7.35 15.53l1.58 1.58a.75.75 0 1 0 1.06-1.06l-1.58-1.58A9.5 9.5 0 0 0 11.5 2.5Zm0 1.5a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
      <path d="M12 7.25a.75.75 0 0 0-.75.75v4.19l-2.22-1.28a.75.75 0 1 0-.75 1.3l3 1.73a.75.75 0 0 0 1.12-.65V8a.75.75 0 0 0-.75-.75Z" />
    </svg>
  );
}

export function ReactIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden {...props}>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function TypeScriptIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 10.5V16h1.4v-2.1h1.9c1.5 0 2.4-.8 2.4-2.1s-.9-2-2.3-2H8.5Zm1.4.9h1.6c.7 0 1.1.3 1.1.9s-.4.9-1.1.9H9.9v-1.8Zm6.4 4.6h1.5l-1.8-2.3 1.7-2.2h-1.4l-1.1 1.5-1.1-1.5h-1.5l1.7 2.2-1.8 2.3Z" />
    </svg>
  );
}

export function TailwindIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 6c-2.8 0-4.5 1.4-5.1 4.2 1-1.4 2.1-1.9 3.4-1.7.74.15 1.27.58 1.86 1.06.96.78 2.07 1.68 4.48 1.68 2.8 0 4.5-1.4 5.1-4.2-1 1.4-2.1 1.9-3.4 1.7-.74-.15-1.27-.58-1.86-1.06C15.52 6.9 14.41 6 12 6ZM6.9 12c-2.8 0-4.5 1.4-5.1 4.2 1-1.4 2.1-1.9 3.4-1.7.74.15 1.27.58 1.86 1.06.96.78 2.07 1.68 4.48 1.68 2.8 0 4.5-1.4 5.1-4.2-1 1.4-2.1 1.9-3.4 1.7-.74-.15-1.27-.58-1.86-1.06C10.42 12.9 9.31 12 6.9 12Z" />
    </svg>
  );
}

export function NodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2 4 6.5v11L12 22l8-4.5v-11L12 2Zm0 1.7 6.5 3.7-6.5 3.7-6.5-3.7L12 3.7ZM5.5 8.3 11 11.3v6.9l-5.5-3.1V8.3Zm13 0v7.8L13 18.2v-6.9l5.5-3Z" />
    </svg>
  );
}

export function MongoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c-.2 2.3-1.5 4.3-3.1 6.2C6.8 10.6 5.5 13.2 5.5 16c0 3.4 2.4 6 6.5 6s6.5-2.6 6.5-6c0-2.8-1.3-5.4-3.4-7.8C13.5 6.3 12.2 4.3 12 2Z" />
    </svg>
  );
}

export function DockerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4 10h2v2H4v-2Zm3 0h2v2H7v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2ZM4 13h2v2H4v-2Zm3 0h2v2H7v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2Zm3-3h2v2h-2v-2ZM7 16h2v2H7v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2Zm-6 3h2v2H7v-2Zm3 0h2v2h-2v-2Z" />
      <path d="M2 12.5c1.8 1.6 4.2 2.5 7 2.5 5.2 0 9.5-3.2 11-7.5H2Z" opacity=".35" />
    </svg>
  );
}

export function FigmaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M8 2h4a4 4 0 0 1 0 8H8V2Zm0 10h4a4 4 0 0 1 0 8H8v-8Zm-2 0a2 2 0 1 0 0 4H6v-4Zm0-8a2 2 0 1 0 0 4H6V4Zm8-2h2a2 2 0 1 1 0 4h-2V2Zm0 10h2a2 2 0 1 1 0 4h-2v-4Z" />
    </svg>
  );
}

export function GitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M14.6 5.4 8.9 11.1a2.5 2.5 0 1 0 1.8 1.8l5.7-5.7a2.5 2.5 0 1 0-1.8-1.8ZM7 13.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm8-8a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
      <path d="M12 2a10 10 0 1 0 3.2 7.3l1.4-1.4A8 8 0 1 1 12 4c1.1 0 2.1.2 3 .6l1.4-1.4A10 10 0 0 0 12 2Z" opacity=".25" />
    </svg>
  );
}

export function PostgresIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 3C8.5 3 6 5.2 6 8.5c0 2 .9 3.7 2.4 4.8-.3.9-.9 2.8-.9 3.7 0 .8.5 1.5 1.8 1.5.7 0 1.4-.2 2-.5.8.3 1.7.5 2.7.5 3.5 0 6-2.2 6-5.5S15.5 3 12 3Zm-1.8 11.2c-.6.2-1.1.3-1.7.3-.6 0-.8-.2-.8-.5 0-.5.4-2 .6-2.8 1 .6 2.2.9 3.5.9.3 0 .6 0 .9-.1-.7.9-1.4 1.6-2.5 2.2Z" />
    </svg>
  );
}

export function FramerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4 4h16v7H12v3h8v6H4V4Z" />
    </svg>
  );
}
