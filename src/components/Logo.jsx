// The app's logo: a calendar with a heart, white on terracotta. The same
// drawing as public/icons/icon.svg, which the home-screen icons are made from.
export default function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#D97757" />
      <rect x="104" y="132" width="304" height="284" rx="36" fill="#FFFDF9" />
      <path d="M104 168 Q104 132 140 132 H372 Q408 132 408 168 V208 H104 Z" fill="#29261B" />
      <rect x="168" y="96" width="32" height="76" rx="16" fill="#FFFDF9" stroke="#D97757" strokeWidth="10" />
      <rect x="312" y="96" width="32" height="76" rx="16" fill="#FFFDF9" stroke="#D97757" strokeWidth="10" />
      <path
        d="M256 374 C202 338 184 306 202 282 C218 261 244 266 256 288 C268 266 294 261 310 282 C328 306 310 338 256 374 Z"
        fill="#D97757"
      />
    </svg>
  )
}
