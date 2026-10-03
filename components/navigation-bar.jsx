"use client"

import { useState } from "react"
import Logo from "@/components/unrelated/logo"
import { Button } from "@/components/ui/button"
import { Trophy, User, PlusCircle } from "lucide-react"
import AuthModal from "@/components/auth-modal"
import TournamentHistoryModal from "@/components/tournament-history-modal"

export default function NavigationBar({ onNewTournament, onLoadTournament }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  return (
    <>
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            v1.0 Dynamic
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onNewTournament}
            className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs h-9 gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>New Setup</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs h-9 gap-1.5"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Tournament History</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAuthOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs h-9 gap-1.5 border border-zinc-700"
          >
            <User className="w-4 h-4 text-emerald-400" />
            <span>{currentUser ? currentUser.name : "Sign In"}</span>
          </Button>
        </div>
      </header>

      {/* History Modal */}
      <TournamentHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadTournament={onLoadTournament}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={currentUser}
        onAuthSuccess={(user) => setCurrentUser(user)}
        onLogout={() => setCurrentUser(null)}
      />
    </>
  )
}
