export default function Panel({ title, actions, children }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                {actions}
            </div>
            {children}
        </section>
    );
}
