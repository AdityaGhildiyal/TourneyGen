"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

export default function CustomizationScreen({ teams, rankingType, options, setOptions, onBack, setStep }) {
  const [enableDates, setEnableDates] = useState(!!options.startDate)
  const [venueNames, setVenueNames] = useState(options.venueNames || Array(options.numVenues).fill("").map((_, i) => `Venue ${i + 1}`))

  function handleOptionChange(key, value) {
    if (key === "numVenues") {
      const newNumVenues = Math.max(1, Number.parseInt(value) || 1)
      const newVenueNames = Array(newNumVenues)
        .fill("")
        .map((_, i) => venueNames[i] || `Venue ${i + 1}`)
      setVenueNames(newVenueNames)
      setOptions({ ...options, numVenues: newNumVenues, venueNames: newVenueNames })
    } else {
      setOptions({ ...options, [key]: value, venueNames })
    }
  }

  function handleVenueNameChange(index, value) {
    const newVenueNames = [...venueNames]
    newVenueNames[index] = value // Allow empty string
    setVenueNames(newVenueNames)
    setOptions({ ...options, venueNames: newVenueNames })
  }

  function handleEnableDates(enabled) {
    setEnableDates(enabled)

    if (!enabled) {
      setOptions((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
        enableRestDays: false,
      }))
    }
  }

  function handleDateChange(field, value) {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function generateFixture() {
    setStep("display")
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "64rem",
        margin: "0 auto",
        backgroundColor: "#111",
        borderRadius: "0.5rem",
        border: "1px solid #333",
      }}
    >
      <div style={{ padding: "1rem", borderBottom: "1px solid #333" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.25rem" }}>Customize Tournament</div>
        <div style={{ fontSize: "0.875rem", color: "#999" }}>Configure how the tournament fixture is generated</div>
      </div>
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500" }}>Tournament Options</label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1rem",
              "@media(minWidth: 768px)": { gridTemplateColumns: "1fr 1fr" },
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}
                htmlFor="seedingMethod"
              >
                Seeding Method
              </label>
              <select
                id="seedingMethod"
                value={options.seedingMethod}
                onChange={(e) => handleOptionChange("seedingMethod", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  borderRadius: "0.25rem",
                  color: "white",
                }}
              >
                <option value="random">Random Seeding</option>
                <option value="mergeSort">Ranked Seeding (Merge Sort)</option>
                <option value="manual">Manual Seeding (Keep Input Order)</option>
              </select>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
                <input
                  id="avoidTopTeamClashes"
                  type="checkbox"
                  checked={options.avoidTopTeamClashes}
                  onChange={(e) => handleOptionChange("avoidTopTeamClashes", e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label
                  htmlFor="avoidTopTeamClashes"
                  style={{
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  Avoid early top-team clashes
                </label>
              </div>
              {options.seedingMethod === "manual" && options.avoidTopTeamClashes && (
                <div style={{ fontSize: "0.75rem", color: "#eab308", marginTop: "0.5rem" }}>
                  Note: Top team clash avoidance is not applied with Manual seeding
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500" }}>Scheduling Options</label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1rem",
              "@media(minWidth: 768px)": { gridTemplateColumns: "1fr 1fr" },
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}
                htmlFor="schedulingMethod"
              >
                Scheduling Method
              </label>
              <select
                id="schedulingMethod"
                value={options.schedulingMethod}
                onChange={(e) => handleOptionChange("schedulingMethod", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  borderRadius: "0.25rem",
                  color: "white",
                }}
              >
                <option value="basic">Basic Scheduling</option>
                <option value="graphColoring">Graph Coloring</option>
              </select>
            </div>

            <div>
              <label
                style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}
                htmlFor="numVenues"
              >
                Number of Venues
              </label>
              <input
                id="numVenues"
                type="number"
                min="1"
                value={options.numVenues}
                onChange={(e) => handleOptionChange("numVenues", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  backgroundColor: "#222",
                  border: "1px solid #333",
                  borderRadius: "0.25rem",
                  color: "white",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem" }}>
              Venue Names
            </label>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {venueNames.map((name, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.875rem", color: "#999" }}>{`Venue ${index + 1}:`}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleVenueNameChange(index, e.target.value)}
                    placeholder={`Venue ${index + 1}`}
                    style={{
                      width: "100%",
                      maxWidth: "16rem",
                      padding: "0.5rem",
                      backgroundColor: "#222",
                      border: "1px solid #333",
                      borderRadius: "0.25rem",
                      color: "white",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500" }}>Maximum Matches Per Day</label>
          </div>

          <div>
            <input
              id="maxMatchesPerDay"
              type="number"
              min="1"
              value={options.maxMatchesPerDay}
              onChange={(e) => handleOptionChange("maxMatchesPerDay", Number.parseInt(e.target.value) || 1)}
              style={{
                width: "8rem",
                padding: "0.5rem",
                backgroundColor: "#222",
                border: "1px solid #333",
                borderRadius: "0.25rem",
                color: "white",
              }}
            />
            <p style={{ fontSize: "0.875rem", color: "#999", marginTop: "0.5rem" }}>
              Limit the number of matches that can be played in a single day
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500" }}>Dynamic Reseeding</label>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                id="enableDynamicReseeding"
                type="checkbox"
                checked={options.enableDynamicReseeding}
                onChange={(e) => handleOptionChange("enableDynamicReseeding", e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label
                htmlFor="enableDynamicReseeding"
                style={{
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                Enable dynamic reseeding for team withdrawals
              </label>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#999", marginTop: "0.5rem" }}>
              Automatically adjust the tournament when teams withdraw using priority queue
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: "1rem", fontWeight: "500" }}>Tournament Dates</label>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                id="enableDates"
                type="checkbox"
                checked={enableDates}
                onChange={(e) => handleEnableDates(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label
                htmlFor="enableDates"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                }}
              >
                Schedule Tournament Dates
              </label>
            </div>

            {enableDates && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>
                      Start Date
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Calendar size={16} color="#999" />
                      <input
                        type="date"
                        value={options.startDate}
                        onChange={(e) => handleDateChange("startDate", e.target.value)}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#222",
                          border: "1px solid #333",
                          borderRadius: "0.25rem",
                          color: "white",
                          width: "100%",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>
                      End Date
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Calendar size={16} color="#999" />
                      <input
                        type="date"
                        value={options.endDate}
                        onChange={(e) => handleDateChange("endDate", e.target.value)}
                        style={{
                          padding: "0.5rem",
                          backgroundColor: "#222",
                          border: "1px solid #333",
                          borderRadius: "0.25rem",
                          color: "white",
                          width: "100%",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      id="enableRestDays"
                      type="checkbox"
                      checked={options.enableRestDays}
                      onChange={(e) => handleOptionChange("enableRestDays", e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label
                      htmlFor="enableRestDays"
                      style={{
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      Enable Rest Days Between Rounds
                    </label>
                  </div>

                  <div style={{ marginTop: "0.75rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>
                      Rest Day Interval
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={options.restDayInterval}
                      onChange={(e) => handleOptionChange("restDayInterval", Number.parseInt(e.target.value) || 1)}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: "#222",
                        border: "1px solid #333",
                        borderRadius: "0.25rem",
                        color: "white",
                        width: "8rem",
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #333",
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
            border: "1px solid #333",
          }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={generateFixture}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "white",
            color: "black",
            borderRadius: "0.25rem",
            fontWeight: "500",
            cursor: "pointer",
            border: "none",
          }}
        >
          Generate Fixture
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}