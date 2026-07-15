import Portfolio from "@/components/portfolio"
import SplashCursor from "@/components/splash-cursor"

export default function Page() {
  return (
    <>
      {/* WebGL fluid vapor that follows the cursor — fixed behind everything (-z-10) */}
      <SplashCursor />
      {/* Radial vignette to keep text readable over the glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,2,12,0.75)_100%)]"
      />
      <Portfolio />
    </>
  )
}
