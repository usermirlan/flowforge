import Link from "next/link";
import { logout } from "@/app/actions";
import { getDict } from "@/lib/locale";
import { getUser } from "@/lib/session";
import LangSwitch from "./LangSwitch";
import Logo from "./Logo";

export default async function Header() {
  const [user, d] = await Promise.all([getUser(), getDict()]);
  const link = "rounded-md px-3 py-1.5 text-sm text-dim hover:bg-raised hover:text-fg";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-6">
          <Link href={user ? "/workflows" : "/"} aria-label="FlowForge">
            <Logo />
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/workflows" className={link}>{d.nav.workflows}</Link>
              <Link href="/credentials" className={link}>{d.nav.credentials}</Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch />
          {user ? (
            <form action={logout} className="flex items-center gap-3">
              <span className="hidden text-sm text-dim sm:inline">{user.name}</span>
              <button className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-raised">{d.nav.logout}</button>
            </form>
          ) : (
            <>
              <Link href="/login" className={link}>{d.nav.login}</Link>
              <Link href="/register" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:brightness-110">
                {d.nav.start}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
