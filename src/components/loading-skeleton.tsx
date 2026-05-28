import { NavBar } from "@/components/nav-bar";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} />;
}

export function HomeSkeleton() {
  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card p-6 md:p-8">
          <SkeletonBlock className="h-3 w-44" />
          <SkeletonBlock className="mt-4 h-12 w-[78%] md:h-16" />
          <SkeletonBlock className="mt-2 h-12 w-[56%] md:h-16" />
          <SkeletonBlock className="mt-6 h-4 w-[74%]" />
          <SkeletonBlock className="mt-2 h-4 w-[46%]" />
          <div className="mt-6 flex gap-3">
            <SkeletonBlock className="h-11 w-44 rounded-xl" />
            <SkeletonBlock className="h-11 w-40 rounded-xl" />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {[...Array(3)].map((_, idx) => (
          <article key={idx} className="card p-5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-3 h-7 w-24" />
            <SkeletonBlock className="mt-3 h-4 w-40" />
          </article>
        ))}
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="card p-6">
          <SkeletonBlock className="h-6 w-64" />
          <SkeletonBlock className="mt-3 h-4 w-[70%]" />
          <div className="mt-5 flex gap-3">
            <SkeletonBlock className="h-11 w-44 rounded-xl" />
            <SkeletonBlock className="h-11 w-44 rounded-xl" />
          </div>
        </div>
      </section>
    </main>
  );
}

export function BuscaSkeleton() {
  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card p-6">
          <SkeletonBlock className="h-7 w-52" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-11 flex-1 rounded-xl" />
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
          </div>
        </div>

        <SkeletonBlock className="mt-5 h-4 w-60" />

        <div className="mt-3 grid gap-3">
          {[...Array(5)].map((_, idx) => (
            <article key={idx} className="card p-4">
              <SkeletonBlock className="h-5 w-52" />
              <SkeletonBlock className="mt-2 h-4 w-[60%]" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function AssinaturasSkeleton() {
  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="card p-5 md:col-span-2">
            <SkeletonBlock className="h-6 w-44" />
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--line)] bg-[#0a1222] p-3">
                  <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-5 w-24" />
                    <SkeletonBlock className="h-5 w-20" />
                  </div>
                  <SkeletonBlock className="mt-2 h-4 w-40" />
                </div>
              ))}
            </div>
          </article>

          <article className="card p-5">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-4 h-4 w-24" />
            <SkeletonBlock className="mt-2 h-8 w-28" />
            <SkeletonBlock className="mt-4 h-4 w-24" />
            <SkeletonBlock className="mt-2 h-7 w-32" />
            <SkeletonBlock className="mt-4 h-4 w-52" />
            <SkeletonBlock className="mt-5 h-11 w-full rounded-xl" />
          </article>
        </div>
      </section>
    </main>
  );
}

export function ConciergeSkeleton() {
  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-4xl px-4">
        <div className="card p-6">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-80" />

          <div className="mt-5 space-y-3">
            {[...Array(2)].map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-[var(--line)] bg-[#0b1324] p-4">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="mt-2 h-4 w-[90%]" />
                <SkeletonBlock className="mt-2 h-4 w-[65%]" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-11 flex-1 rounded-xl" />
            <SkeletonBlock className="h-11 w-24 rounded-xl" />
          </div>
        </div>
      </section>
    </main>
  );
}