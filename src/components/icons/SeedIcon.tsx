interface SeedIconProps {
  color?: string;
  size?: number;
  className?: string;
}

export default function SeedIcon({
  color = 'currentColor',
  size = 20,
  className,
}: SeedIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g>
        <path
          d="M24 10C18 14 14 22 14 30C14 42 22 51 30 57C36 51 42 42 42 30C42 22 38 14 32 10C30 9 26 9 24 10Z"
          fill={color}
          opacity="0.92"
        />
        <path
          d="M40 14C34 18 30 26 30 34C30 44 36 52 42 58C48 54 54 46 54 36C54 28 50 20 44 14C43 13 41 13 40 14Z"
          fill={color}
          opacity="0.8"
        />
        <path
          d="M14 20C9 24 6 30 6 37C6 46 12 53 18 58C24 54 28 47 28 39C28 31 24 24 18 20C17 19 15 19 14 20Z"
          fill={color}
          opacity="0.76"
        />
        <path
          d="M25 16C23 21 22 30 22 41"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M41 20C39 25 38 33 38 44"
          stroke="white"
          strokeOpacity="0.22"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M14 26C13 31 13 37 14 44"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}