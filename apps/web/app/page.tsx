import WaitlistForm from '../components/WaitlistForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Ask your Tableau data anything.
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          QueryLens puts a natural language layer on top of Tableau.
          No analyst required. No clicking. Just ask.
        </p>
        <div className="mt-10">
          <WaitlistForm />
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Early access — Tableau Cloud trial accounts welcome.
        </p>
      </div>
    </main>
  )
}
