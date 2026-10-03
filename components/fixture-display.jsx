"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Copy, AlertCircle, UserX, Calendar, List, Trophy, Save, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateTournament } from "@/lib/tournament-generator"
import { dynamicReseeding } from "@/lib/algorithms/reseeding/dynamicReseeding"
import { postponeMatch } from "@/lib/algorithms/scheduling/postponement"
import TableView from "@/components/table-view"
import BracketView from "@/components/bracket-view"

export default function FixtureDisplay({ teams, options, rankingType, onBack }) {
  const [matches, setMatches] = useState([])
  const [algorithmInsights, setAlgorithmInsights] = useState([])
  const [isGenerating, setIsGenerating] = useState(true)
  const [error, setError] = useState(null)
  const [withdrawnTeams, setWithdrawnTeams] = useState(options.withdrawnTeams || [])
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showPostponeModal, setShowPostponeModal] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const fixtureRef = useRef(null)
  const [activeTab, setActiveTab] = useState("table")

  const [schedule, setSchedule] = useState([])
  const [postponedMatches, setPostponedMatches] = useState({})
  const [originalScheduleDays, setOriginalScheduleDays] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)

  const handleSaveTournament = async () => {
    setIsSaving(true)
    try {
      const tournamentName = window.prompt("Enter a name for this tournament:", `Tournament ${new Date().toLocaleDateString()}`)
      if (!tournamentName) {
        setIsSaving(false)
        return
      }

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentName,
          sportType: "General",
          tournamentType: "Knockout",
          status: "ONGOING",
          isPublic: true,
          algorithmOptions: options,
          teams: teams.map((t, idx) => ({ name: t.name, seed: idx + 1, rating: t.ranking || 1000 })),
          venues: Array.from({ length: options.numVenues || 1 }).map((_, i) => ({ name: `Court ${i + 1}`, courtNumber: i + 1 })),
          fixtures: matches,
          snapshotData: { teams, options, matches, schedule },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to save tournament")
      }

      const data = await res.json()
      setSavedId(data.tournament.id)
      toast.success(`Tournament "${tournamentName}" saved to database!`)
    } catch (err) {
      toast.error(err.message || "Could not save tournament")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (!Array.isArray(teams) || teams.length === 0) {
          throw new Error("No teams provided for tournament generation")
        }

        const invalidTeams = teams.filter((team) => !team || team.id === undefined)
        if (invalidTeams.length > 0) {
          throw new Error("Some teams are missing required id property")
        }

        const updatedOptions = {
          ...options,
          withdrawnTeams: withdrawnTeams,
        }

        const {
          matches: generatedMatches,
          insights,
          schedule: generatedSchedule,
        } = generateTournament(teams, updatedOptions, rankingType)

        if (!generatedMatches || generatedMatches.length === 0) {
          throw new Error("Failed to generate matches")
        }

        console.log("Generated rounds:", [...new Set(generatedMatches.map((m) => m.round))])

        const processedSchedule = generatedSchedule
          ? generatedSchedule.map((day) => ({
              ...day,
              date: new Date(day.date),
            }))
          : []

        setMatches(generatedMatches)
        setAlgorithmInsights(insights)
        setSchedule(processedSchedule)
        setError(null)
      } catch (err) {
        console.error("Error generating tournament:", err)
        setError(err.message || "Failed to generate tournament fixture")
        setMatches([])
        setAlgorithmInsights(["Error: Tournament generation failed"])
        setSchedule([])
      } finally {
        setIsGenerating(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [teams, options, rankingType, withdrawnTeams])

  function handleMatchResult(matchId, winnerId) {
    setMatches((prevMatches) => {
      const updatedMatches = [...prevMatches]

      const matchIndex = updatedMatches.findIndex((m) => m.id === matchId)
      if (matchIndex >= 0) {
        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          winnerId,
          status: "completed",
        }

        const currentMatch = updatedMatches[matchIndex]
        const nextMatchId = currentMatch.nextMatchId

        if (nextMatchId) {
          const nextMatchIndex = updatedMatches.findIndex((m) => m.id === nextMatchId)
          if (nextMatchIndex >= 0) {
            if (currentMatch.position === "top") {
              updatedMatches[nextMatchIndex] = {
                ...updatedMatches[nextMatchIndex],
                team1Id: winnerId,
              }
            } else {
              updatedMatches[nextMatchIndex] = {
                ...updatedMatches[nextMatchIndex],
                team2Id: winnerId,
              }
            }
          }
        }
      }

      return updatedMatches
    })
  }

  function handleTeamWithdrawal(teamId) {
    try {
      const newWithdrawnTeams = [...withdrawnTeams, teamId]
      setWithdrawnTeams(newWithdrawnTeams)

      const reseedInsight = "Dynamic Reseeding: Applied during tournament"

      if (!algorithmInsights.includes(reseedInsight)) {
        setAlgorithmInsights([...algorithmInsights, reseedInsight])
      }

      const updatedMatches = dynamicReseeding(matches, teams, newWithdrawnTeams, rankingType)

      console.log("Reseeded rounds:", [...new Set(updatedMatches.map((m) => m.round))])

      setMatches(updatedMatches)
    } catch (error) {
      console.error("Error during team withdrawal:", error)
      setAlgorithmInsights([...algorithmInsights, "Error: Team withdrawal failed"])
    } finally {
      setShowWithdrawModal(false)
    }
  }

  function handlePostponeMatchClick(matchId) {
    setSelectedMatchId(matchId)
    setShowPostponeModal(true)
  }

  function handlePostponeMatch() {
    if (!selectedMatchId) return

    try {
      const originalDay = schedule.find((day) => !day.isRestDay && day.matches.some((m) => m.id === selectedMatchId))

      if (originalDay) {
        const originalDate = new Date(originalDay.date)
        const formattedOriginalDate = originalDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        setOriginalScheduleDays((prev) => ({
          ...prev,
          [selectedMatchId]: {
            date: originalDate,
            formattedDate: formattedOriginalDate,
            round: originalDay.round,
          },
        }))
      }

      const { matches: updatedMatches, schedule: updatedSchedule } = postponeMatch(
        selectedMatchId,
        matches,
        schedule,
        teams,
        options,
      )

      const newScheduleDay = updatedSchedule.find(
        (day) => !day.isRestDay && day.matches.some((m) => m.id === selectedMatchId && m.status === "postponed"),
      )

      if (newScheduleDay) {
        const newDate = new Date(newScheduleDay.date)
        const formattedDate = newDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        setPostponedMatches((prev) => ({
          ...prev,
          [selectedMatchId]: formattedDate,
        }))

        if (originalDay && new Date(originalDay.date).toDateString() === newDate.toDateString()) {
          alert("Warning: Could not find a different date for this match. Please check the schedule.")
        } else {
          alert(`Match has been rescheduled to ${formattedDate}`)
        }
      }

      setMatches(updatedMatches)
      setSchedule(updatedSchedule)

      const postponeInsight = "Match Postponement: Applied scheduling algorithm"
      if (!algorithmInsights.includes(postponeInsight)) {
        setAlgorithmInsights([...algorithmInsights, postponeInsight])
      }
    } catch (error) {
      console.error("Error during match postponement:", error)
      setAlgorithmInsights([...algorithmInsights, "Error: Match postponement failed"])
    } finally {
      setShowPostponeModal(false)
      setSelectedMatchId(null)
    }
  }

  function copyToClipboard() {
    const textData = matches
      .map(
        (match) =>
          `Match ${match.id}: ${teams.find((t) => t?.id === match.team1Id)?.name || "TBD"} vs ${
            teams.find((t) => t?.id === match.team2Id)?.name || "TBD"
          } (${match.round}, Venue: ${match.venue})`,
      )
      .join("\n")

    navigator.clipboard
      .writeText(textData)
      .then(() => alert("Fixture copied to clipboard"))
      .catch((err) => console.error("Failed to copy: ", err))
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  function getTeamName(teamId) {
    if (!teamId) return "TBD"
    const team = teams.find((t) => t && t.id === teamId)
    return team ? team.name : "Unknown Team"
  }

  function getMatchById(matchId) {
    return matches.find((m) => m.id === matchId) || null
  }

  return (
    <>
      {/* Team Withdrawal Modal */}
      {showWithdrawModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              borderRadius: "0.5rem",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#333",
              padding: "1rem",
              width: "90%",
              maxWidth: "30rem",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Select Team to Withdraw</h3>
            <div
              style={{
                maxHeight: "20rem",
                overflowY: "auto",
                marginBottom: "1rem",
              }}
            >
              {teams
                .filter((team) => !withdrawnTeams.includes(team.id))
                .map((team) => (
                  <div
                    key={team.id}
                    style={{
                      padding: "0.5rem",
                      borderBottomWidth: "1px",
                      borderBottomStyle: "solid",
                      borderBottomColor: "#333",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onClick={() => handleTeamWithdrawal(team.id)}
                  >
                    <span>
                      {team.name} (Ranking: {team.ranking})
                    </span>
                    <UserX size={16} />
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: "white",
                  borderRadius: "0.25rem",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#333",
                  cursor: "pointer",
                }}
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostponeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              borderRadius: "0.5rem",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#333",
              padding: "1rem",
              width: "90%",
              maxWidth: "30rem",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Postpone Match</h3>
            {selectedMatchId && (
              <div style={{ marginBottom: "1rem" }}>
                <p>Are you sure you want to postpone this match?</p>
                <div
                  style={{
                    backgroundColor: "#222",
                    padding: "0.75rem",
                    borderRadius: "0.25rem",
                    marginTop: "0.75rem",
                  }}
                >
                  {(() => {
                    const match = getMatchById(selectedMatchId)
                    if (match) {
                      return (
                        <>
                          <p>
                            <strong>Round:</strong> {match.round}
                          </p>
                          <p>
                            <strong>Teams:</strong> {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                          </p>
                        </>
                      )
                    }
                    return <p>Match not found</p>
                  })()}
                </div>
                <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#999" }}>
                  The system will find the best available date for this match while ensuring both teams have adequate
                  rest days.
                </p>
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "rgba(234, 179, 8, 0.1)",
                    borderRadius: "0.25rem",
                    borderLeft: "3px solid #eab308",
                    color: "#eab308",
                  }}
                >
                  <p style={{ fontWeight: "bold" }}>New Date Found</p>
                  <p>The match will be rescheduled to the next available date in the tournament calendar.</p>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: "white",
                  borderRadius: "0.25rem",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#333",
                  cursor: "pointer",
                }}
                onClick={() => setShowPostponeModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#eab308",
                  color: "black",
                  borderRadius: "0.25rem",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={handlePostponeMatch}
              >
                Confirm Postponement
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "100%" }}>
        <div
          ref={fixtureRef}
          style={{
            width: "100%",
            maxWidth: "72rem",
            margin: "0 auto",
            backgroundColor: "#111",
            borderRadius: "0.5rem",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#333",
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderBottomWidth: "1px",
              borderBottomStyle: "solid",
              borderBottomColor: "#333",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                "@media(minWidth: 768px)": {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Tournament Fixture</h2>
                <p style={{ fontSize: "0.875rem", color: "#999" }}>
                  {isGenerating
                    ? "Generating fixture..."
                    : error
                      ? "Error generating fixture"
                      : `${teams.length} teams, Knockout format`}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {algorithmInsights.map((insight, index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: "#333",
                      backgroundColor: insight.includes("Error") ? "rgba(239, 68, 68, 0.1)" : "#222",
                      color: insight.includes("Error") ? "#ef4444" : "#999",
                    }}
                  >
                    {insight}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {isGenerating ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "3rem 0",
                }}
              >
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    borderRadius: "50%",
                    borderWidth: "3px",
                    borderStyle: "solid",
                    borderColor: "white",
                    borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1rem",
                  }}
                ></div>
                <p style={{ fontSize: "1rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                  Generating Tournament Fixture
                </p>
                <p style={{ fontSize: "0.875rem", color: "#999" }}>Applying algorithms...</p>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "0.25rem",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <AlertCircle size={32} color="#ef4444" />
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "500", marginBottom: "0.5rem", color: "#ef4444" }}>
                    Error Generating Tournament
                  </h3>
                  <p style={{ color: "#999" }}>{error}</p>
                </div>
                <button
                  onClick={onBack}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "transparent",
                    color: "white",
                    borderRadius: "0.25rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "#333",
                    marginTop: "0.5rem",
                  }}
                >
                  <ChevronLeft size={16} />
                  Back to Setup
                </button>
              </div>
            ) : (
              <>
                {matches.length === 0 ? (
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#222",
                      borderRadius: "0.25rem",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderColor: "#333",
                      textAlign: "center",
                    }}
                  >
                    <h3 style={{ fontWeight: "600", marginBottom: "0.25rem" }}>No Matches Generated</h3>
                    <p>Unable to generate tournament matches. Please try again with different settings.</p>
                  </div>
                ) : (
                  <>
                    {/* Team Withdrawal and Match Postponement Buttons */}
                    <div
                      style={{
                        marginBottom: "1rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={handleSaveTournament}
                        disabled={isSaving}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          backgroundColor: savedId ? "#059669" : "#10b981",
                          color: "white",
                          borderRadius: "0.25rem",
                          border: "none",
                          fontWeight: "500",
                          cursor: isSaving ? "not-allowed" : "pointer",
                        }}
                      >
                        {isSaving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : savedId ? (
                          <Check size={16} />
                        ) : (
                          <Save size={16} />
                        )}
                        {savedId ? "Saved in History" : "Save Tournament"}
                      </button>

                      <button
                        onClick={() => setShowWithdrawModal(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          backgroundColor: "#222",
                          color: "white",
                          borderRadius: "0.25rem",
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor: "#333",
                          cursor: "pointer",
                        }}
                      >
                        <UserX size={16} />
                        Withdraw Team
                      </button>

                      {withdrawnTeams.length > 0 && (
                        <div
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.875rem",
                            color: "#999",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {withdrawnTeams.length} team(s) withdrawn
                        </div>
                      )}
                    </div>

                    {/* Tabs */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          borderBottomWidth: "1px",
                          borderBottomStyle: "solid",
                          borderBottomColor: "#333",
                        }}
                      >
                        <button
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: activeTab === "table" ? "#222" : "transparent",
                            color: activeTab === "table" ? "white" : "#999",
                            borderWidth: "0",
                            borderBottomWidth: activeTab === "table" ? "2px" : "0",
                            borderBottomStyle: activeTab === "table" ? "solid" : "none",
                            borderBottomColor: activeTab === "table" ? "white" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveTab("table")}
                        >
                          <List size={16} />
                          Table View
                        </button>
                        <button
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: activeTab === "bracket" ? "#222" : "transparent",
                            color: activeTab === "bracket" ? "white" : "#999",
                            borderWidth: "0",
                            borderBottomWidth: activeTab === "bracket" ? "2px" : "0",
                            borderBottomStyle: activeTab === "bracket" ? "solid" : "none",
                            borderBottomColor: activeTab === "bracket" ? "white" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveTab("bracket")}
                        >
                          <Trophy size={16} />
                          Bracket View
                        </button>
                        <button
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: activeTab === "schedule" ? "#222" : "transparent",
                            color: activeTab === "schedule" ? "white" : "#999",
                            borderWidth: "0",
                            borderBottomWidth: activeTab === "schedule" ? "2px" : "0",
                            borderBottomStyle: activeTab === "schedule" ? "solid" : "none",
                            borderBottomColor: activeTab === "schedule" ? "white" : "transparent",
                            cursor: "pointer",
                          }}
                          onClick={() => setActiveTab("schedule")}
                        >
                          <Calendar size={16} />
                          Schedule
                        </button>
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div
                      style={{
                        backgroundColor: "#222",
                        padding: "0.75rem",
                        borderRadius: "0.25rem",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: "#333",
                      }}
                    >
                      {activeTab === "table" && (
                        <TableView
                          matches={matches}
                          teams={teams}
                          onMatchResult={handleMatchResult}
                          onPostponeMatch={handlePostponeMatchClick}
                          postponedMatches={postponedMatches}
                        />
                      )}

                      {activeTab === "bracket" && (
                        <BracketView
                          matches={matches}
                          teams={teams}
                          onMatchResult={handleMatchResult}
                          postponedMatches={postponedMatches}
                        />
                      )}

                      {activeTab === "schedule" && schedule.length > 0 && (
                        <div>
                          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Tournament Schedule</h3>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem",
                                      color: "#999",
                                      borderBottomWidth: "1px",
                                      borderBottomStyle: "solid",
                                      borderBottomColor: "#333",
                                    }}
                                  >
                                    Date
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem",
                                      color: "#999",
                                      borderBottomWidth: "1px",
                                      borderBottomStyle: "solid",
                                      borderBottomColor: "#333",
                                    }}
                                  >
                                    Type
                                  </th>
                                  <th
                                    style={{
                                      textAlign: "left",
                                      padding: "0.5rem",
                                      color: "#999",
                                      borderBottomWidth: "1px",
                                      borderBottomStyle: "solid",
                                      borderBottomColor: "#333",
                                    }}
                                  >
                                    Matches
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedule.map((day, index) => (
                                  <tr
                                    key={index}
                                    style={{
                                      borderBottomWidth: "1px",
                                      borderBottomStyle: "solid",
                                      borderBottomColor: "#333",
                                    }}
                                  >
                                    <td style={{ padding: "0.5rem" }}>{formatDate(day.date)}</td>
                                    <td style={{ padding: "0.5rem" }}>
                                      {day.isRestDay ? (
                                        <span
                                          style={{
                                            display: "inline-block",
                                            fontSize: "0.75rem",
                                            padding: "0.125rem 0.25rem",
                                            borderRadius: "0.25rem",
                                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                                            color: "#10b981",
                                          }}
                                        >
                                          Rest Day
                                        </span>
                                      ) : day.round.includes("Postponed") ? (
                                        <span
                                          style={{
                                            display: "inline-block",
                                            fontSize: "0.75rem",
                                            padding: "0.125rem 0.25rem",
                                            borderRadius: "0.25rem",
                                            backgroundColor: "rgba(234, 179, 8, 0.1)",
                                            color: "#eab308",
                                          }}
                                        >
                                          {day.round}
                                        </span>
                                      ) : (
                                        day.round
                                      )}
                                    </td>
                                    <td style={{ padding: "0.5rem" }}>
                                      {day.isRestDay ? (
                                        "No matches"
                                      ) : (
                                        <div>
                                          <span>{day.matches.length} matches</span>
                                          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#999" }}>
                                            {day.matches.map((match, idx) => {
                                              // Check if this is a postponed match
                                              const isPostponed = match.status === "postponed"
                                              const originalScheduleInfo = originalScheduleDays[match.id]

                                              return (
                                                <div key={idx} style={{ marginBottom: "0.25rem" }}>
                                                  {getTeamName(match.team1Id)} vs {getTeamName(match.team2Id)}
                                                  {match.venue && <span> (Venue {match.venue})</span>}
                                                  {/* Show postponed status */}
                                                  {isPostponed && (
                                                    <span
                                                      style={{
                                                        marginLeft: "0.5rem",
                                                        fontSize: "0.7rem",
                                                        padding: "0.1rem 0.25rem",
                                                        borderRadius: "0.25rem",
                                                        backgroundColor: "rgba(234, 179, 8, 0.1)",
                                                        color: "#eab308",
                                                      }}
                                                    >
                                                      Postponed
                                                    </span>
                                                  )}
                                                  {/* Show original date for postponed matches */}
                                                  {isPostponed && originalScheduleInfo && (
                                                    <div
                                                      style={{
                                                        marginTop: "0.25rem",
                                                        marginLeft: "1rem",
                                                        fontSize: "0.7rem",
                                                        padding: "0.1rem 0.25rem",
                                                        borderRadius: "0.25rem",
                                                        backgroundColor: "rgba(234, 179, 8, 0.1)",
                                                        color: "#eab308",
                                                      }}
                                                    >
                                                      Originally scheduled: {originalScheduleInfo.formattedDate}
                                                    </div>
                                                  )}
                                                  {/* Show new date for postponed matches */}
                                                  {isPostponed && postponedMatches[match.id] && (
                                                    <div
                                                      style={{
                                                        marginTop: "0.25rem",
                                                        marginLeft: "1rem",
                                                        fontSize: "0.7rem",
                                                        padding: "0.1rem 0.25rem",
                                                        borderRadius: "0.25rem",
                                                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                                                        color: "#3b82f6",
                                                      }}
                                                    >
                                                      Rescheduled to: {postponedMatches[match.id]}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {activeTab === "schedule" && schedule.length === 0 && (
                        <div style={{ textAlign: "center", padding: "2rem 0" }}>
                          <p>No schedule available. Enable date scheduling in tournament options.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div
            style={{
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: "#333",
              "@media(minWidth: 640px)": {
                flexDirection: "row",
                justifyContent: "space-between",
              },
            }}
          >
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "transparent",
                color: "white",
                borderRadius: "0.25rem",
                fontWeight: "500",
                cursor: "pointer",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#333",
                width: "100%",
                "@media(minWidth: 640px)": { width: "auto" },
              }}
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                width: "100%",
                "@media(minWidth: 640px)": {
                  flexDirection: "row",
                  width: "auto",
                },
              }}
            >
              <button
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: "white",
                  borderRadius: "0.25rem",
                  fontWeight: "500",
                  cursor: isGenerating || matches.length === 0 ? "not-allowed" : "pointer",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#333",
                  opacity: isGenerating || matches.length === 0 ? "0.5" : "1",
                }}
                disabled={isGenerating || matches.length === 0}
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
