"use client"

import { useState, Suspense } from "react"
import TournamentSetup from "@/components/tournament-setup"
import LoadingSpinner from "@/components/unrelated/loading-spinner"
import NavigationBar from "@/components/navigation-bar"
import { toast } from "sonner"

export default function Home() {
  const [setupKey, setSetupKey] = useState(1)

  const handleNewTournament = () => {
    setSetupKey((prev) => prev + 1)
    toast.info("Started fresh tournament setup")
  }

  const handleLoadTournament = (tournament) => {
    setSetupKey((prev) => prev + 1)
    toast.success(`Loaded tournament: ${tournament.name}`)
  }

  return (
    <main className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <NavigationBar
          onNewTournament={handleNewTournament}
          onLoadTournament={handleLoadTournament}
        />

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Smart Tournament Fixture Generator
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
            Algorithmic tournament scheduling with Hamiltonian paths, graph coloring, dynamic reseeding, and persistent MongoDB tournament archives.
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <TournamentSetup key={setupKey} />
        </Suspense>
      </div>
    </main>
  )
}
