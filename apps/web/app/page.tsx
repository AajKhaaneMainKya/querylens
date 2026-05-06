import WaitlistForm from '../components/WaitlistForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">

        {/* Headline */}
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Ask your Tableau data anything.
        </h1>

        {/* Social proof */}
        <p className="mt-4 text-base text-gray-500">
          Built for CFOs, VP Sales, and Marketing Heads who use Tableau but hate waiting for analysts.
        </p>

        {/* How it works */}
        <div className="mt-12 grid grid-cols-3 gap-6 text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">1 — Ask</p>
            <p className="text-sm text-gray-700 font-medium">Type a question in plain English</p>
            <p className="mt-1 text-xs text-gray-400">No SQL. No Tableau knowledge required.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">2 — Filter</p>
            <p className="text-sm text-gray-700 font-medium">QueryLens applies the right Tableau filters automatically</p>
            <p className="mt-1 text-xs text-gray-400">AI reads your intent and maps it to your data.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">3 — See</p>
            <p className="text-sm text-gray-700 font-medium">The correct chart appears instantly</p>
            <p className="mt-1 text-xs text-gray-400">PNG export included. No analyst in the loop.</p>
          </div>
        </div>

        {/* Waitlist form */}
        <div className="mt-12">
          <WaitlistForm />
        </div>

        {/* Try the demo */}
        <div className="mt-4">
          <a
            href="/chat?client=24e7b3b4-987e-4b4d-a478-9434564ba292"
            className="inline-block rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            Try the demo →
          </a>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs text-gray-400">
          Early access — Tableau Cloud trial accounts welcome.
        </p>

      </div>
    </main>
  )
}
