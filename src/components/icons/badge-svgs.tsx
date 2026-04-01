import type { SvgIconProps } from '@/types';
import { Feather as FeatherIcon } from 'lucide-react';

function FeatherSvg({ color, size }: SvgIconProps) {
  return (
    <FeatherIcon color={color} size={size} strokeWidth={1.8} />
  );
}

function PlumeSvg({ color, size }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 2C28 6 22 16 20 26C18 36 16 48 14 60L16 60C18 52 22 40 26 32C30 24 36 14 40 8C42 4 42 2 40 2C38 2 34 2 32 2Z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M32 2C36 8 40 18 42 28C44 36 44 46 42 54"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M28 10C24 20 20 34 18 48"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M36 10C38 20 40 32 40 44"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.3"
      />
      <ellipse cx="32" cy="6" rx="4" ry="6" fill={color} opacity="0.6" />
      <ellipse cx="30" cy="10" rx="6" ry="8" fill={color} opacity="0.4" />
      <ellipse cx="34" cy="10" rx="6" ry="8" fill={color} opacity="0.4" />
    </svg>
  );
}

function QuillSvg({ color, size }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M48 2C40 8 30 22 24 34C20 42 16 52 12 60L14 62C16 58 18 54 20 50L22 56L24 50C26 42 30 32 36 22C42 14 48 6 48 2Z"
        fill={color}
        opacity="0.9"
      />
      <path
        d="M48 2C44 10 36 24 30 34C24 44 18 54 14 62"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="14"
        y1="62"
        x2="12"
        y2="60"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Milestone Badge Components ───

// 1. Downy Feather (10) — Raven unlock
export function DownyFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#B6B6FF" size={size} />;
}

// 2. Contour Feather (25) — Robin unlock
export function ContourFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#D94311" size={size} />;
}

// 3. Tail Feather (50) — Gull unlock
export function TailFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#7CD9FF" size={size} />;
}

// 4. Wing Feather (75) — Crane unlock
export function WingFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#C94040" size={size} />;
}

// 5. Flight Feather (100) — Woodpecker unlock
export function FlightFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#B71C1C" size={size} />;
}

// 6. Iridescent Feather (150) — Blue Jay unlock
export function IridescentFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#82B1FF" size={size} />;
}

// 7. Crest Feather (200) — Oriole unlock
export function CrestFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#FFF176" size={size} />;
}

// 8. Plume (275) — Heron unlock
export function PlumeBadge({ size }: SvgIconProps) {
  return <PlumeSvg color="#607D8B" size={size} />;
}

// 9. Quill (350) — Cardinal unlock
export function QuillBadge({ size }: SvgIconProps) {
  return <QuillSvg color="#FFD700" size={size} />;
}

// 10. Bronze Feather (450) — Flamingo unlock
export function BronzeFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#CD7F32" size={size} />;
}

// 11. Silver Feather (550) — Swan unlock
export function SilverFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#C0C0C0" size={size} />;
}

// 12. Gold Feather (700) — Owl unlock
export function GoldFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#FFD700" size={size} />;
}

// 13. Platinum Feather (850) — Hawk unlock
export function PlatinumFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#E5E4E2" size={size} />;
}

// 14. Diamond Feather (1000) — Loon unlock
export function DiamondFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#B9F2FF" size={size} />;
}

// 15. Opal Feather (1250) — Falcon unlock
export function OpalFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#A8C8E8" size={size} />;
}

// 16. Phoenix Feather (1500) — Indigo Bunting unlock
export function PhoenixFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#FF4500" size={size} />;
}

// 17. Aurora Feather (2000) — Hummingbird unlock
export function AuroraFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#FF80AB" size={size} />;
}

// 18. Celestial Feather (2500) — Toucan unlock
export function CelestialFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#FF6D00" size={size} />;
}

// 19. Eternal Feather (3000) — Condor unlock
export function EternalFeatherBadge({ size }: SvgIconProps) {
  return <FeatherSvg color="#B33C2A" size={size} />;
}
