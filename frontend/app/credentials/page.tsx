import CredentialForm from "@/components/CredentialForm";
import { deleteCredential } from "@/app/actions";
import { api } from "@/lib/api";
import { ago } from "@/lib/format";
import { getDict } from "@/lib/locale";
import { requireToken } from "@/lib/session";
import type { Catalog, Credential } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getDict()).meta.credentials };
}

export default async function CredentialsPage() {
  const token = await requireToken("/credentials");
  const [catalog, creds, d] = await Promise.all([api<Catalog>("/api/nodes"), api<Credential[]>("/api/credentials", { token }), getDict()]);
  return (
    <main className="mx-auto grid max-w-[1100px] gap-8 px-5 py-10 md:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{d.creds.title}</h1>
          <p className="mt-1 text-dim">{d.creds.lead}</p>
        </div>
        {creds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-dim">{d.creds.empty}</p>
        ) : (
          creds.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="truncate text-xs text-dim">
                  {catalog.credential_types[c.type]?.label ?? c.type} · {Object.entries(c.preview).map(([k, v]) => `${k}: ${v}`).join(" · ")} · {ago(c.created_at, d)}
                </p>
              </div>
              <form action={deleteCredential.bind(null, c.id)}>
                <button className="rounded-md border border-line px-2.5 py-1 text-xs text-bad hover:bg-bad/10">{d.creds.delete}</button>
              </form>
            </div>
          ))
        )}
      </section>
      <CredentialForm types={catalog.credential_types} />
    </main>
  );
}
