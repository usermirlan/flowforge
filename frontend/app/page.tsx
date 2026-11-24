import Link from "next/link";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/locale";
import { getUser } from "@/lib/session";

function Chip({ color, icon, title, sub }: { color: string; icon: string; title: string; sub: string }) {
  return (
    <div className="flex w-52 items-center gap-3 rounded-xl text-left border border-line bg-surface p-3 shadow-xl shadow-black/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-dim">{sub}</span>
      </span>
    </div>
  );
}

export default async function Home() {
  if (await getUser()) redirect("/workflows");
  const d = await getDict();
  const L = d.landing;
  return (
    <main>
      <section className="dots border-b border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-10 px-5 py-20 text-center md:py-28">
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-dim">{L.badge}</span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            {L.title1}<span className="text-accent">{L.title2}</span>
          </h1>
          <p className="max-w-2xl text-lg text-dim">
            {L.lead}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:brightness-110">{L.cta}</Link>
            <Link href="/login" className="rounded-lg border border-line px-5 py-3 font-medium hover:bg-raised">{d.nav.login}</Link>
          </div>
          <div aria-hidden className="mt-4 flex flex-wrap items-center justify-center gap-3 text-dim">
            <Chip color="var(--color-trigger)" icon="⚡" title={L.chip[0][0]} sub={L.chip[0][1]} />
            <span>→</span>
            <Chip color="var(--color-logic)" icon="⑂" title={L.chip[1][0]} sub={L.chip[1][1]} />
            <span>→</span>
            <Chip color="var(--color-action)" icon="✈" title={L.chip[2][0]} sub={L.chip[2][1]} />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1200px] gap-4 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
        {L.features.map(([icon, title, text]) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-6">
            <div className="text-xl">{icon}</div>
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-dim">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
