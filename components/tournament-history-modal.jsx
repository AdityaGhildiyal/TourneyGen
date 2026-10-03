"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Trophy,
  Calendar,
  Users,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react"

export default function TournamentHistoryModal({ isOpen, onClose, onLoadTournament }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  const fetchTournaments = async () => {
    setLoading(true)
    try {
      let url = "/api/tournaments?"
      if (selectedStatus !== "ALL") url += `status=${selectedStatus}&`
      if (search) url += `search=${encodeURIComponent(search)}&`

      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch tournaments")
      const data = await res.json()
      setTournaments(data.tournaments || [])
    } catch (err) {
      console.warn("Could not fetch tournaments from database:", err)
      // Provide demo/sample history if DB is not connected yet
      setTournaments([
        {
          id: "demo-1",
          name: "Inter-Collegiate Football Cup 2026",
          sportType: "Football",
          status: "COMPLETED",
          tournamentType: "Knockout",
          createdAt: new Date().toISOString(),
          _count: { teams: 16, fixtures: 15, venues: 2 },
        },
        {
          id: "demo-2",
          name: "State Badminton Championship",
          sportType: "Badminton",
          status: "ONGOING",
          tournamentType: "Knockout",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          _count: { teams: 8, fixtures: 7, venues: 4 },
        },
        {
          id: "demo-3",
          name: "Spring Basketball Invitational",
          sportType: "Basketball",
          status: "DRAFT",
          tournamentType: "RoundRobin",
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          _count: { teams: 4, fixtures: 6, venues: 1 },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTournaments()
    }
  }, [isOpen, selectedStatus])

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</Badge>
      case "ONGOING":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Ongoing</Badge>
      case "PUBLISHED":
        return <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Published</Badge>
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700">Draft</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-zinc-950 border-zinc-800 text-white flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Tournament History & Archives
            </DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchTournaments}
              disabled={loading}
              className="text-zinc-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <DialogDescription className="text-zinc-400 text-sm">
            Browse and load past tournaments, brackets, and match schedules saved in your database.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row gap-2 my-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search tournament name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTournaments()}
              className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "DRAFT", "ONGOING", "COMPLETED"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={selectedStatus === st ? "default" : "outline"}
                onClick={() => setSelectedStatus(st)}
                className={`text-xs h-9 ${
                  selectedStatus === st
                    ? "bg-zinc-800 text-white border-zinc-700"
                    : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Tournament Cards List */}
        <ScrollArea className="flex-1 pr-3 -mr-3 max-h-[450px]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-sm">Loading tournament archives...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg my-2">
              <Layers className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-400">No tournaments found</p>
              <p className="text-xs text-zinc-600 mt-1">
                Save a tournament from the generator to see it in your history archive!
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-white text-base">{t.name}</h4>
                      {getStatusBadge(t.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-zinc-500" />
                        {t.sportType || "Tournament"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        {t._count?.teams || 0} Teams
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8"
                      onClick={() => {
                        toast.success(`Loaded tournament: ${t.name}`)
                        if (onLoadTournament) onLoadTournament(t)
                        onClose()
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
