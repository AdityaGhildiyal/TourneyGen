/**
 * Date scheduling algorithm for tournament matches
 * Time Complexity: O(n log n) where n is the number of matches
 * Space Complexity: O(n)
 *
 * @param {Array} matches - Array of match objects
 * @param {Object} options - Scheduling options
 * @returns {Array} - Array of schedule days with matches
 */
export function scheduleMatchDates(matches, options) {
  // If dates are not provided, return empty schedule
  if (!options.startDate || !options.endDate) {
    return []
  }

  const { startDate, endDate, enableRestDays = false, restDayInterval = 3, maxMatchesPerDay = 4 } = options

  const start = new Date(startDate)
  const end = new Date(endDate)

  // Calculate total days available
  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1

  if (totalDays <= 0) {
    console.error("End date must be after start date")
    return []
  }

  // Group matches by round
  const roundMatches = {}
  matches.forEach((match) => {
    if (!roundMatches[match.round]) {
      roundMatches[match.round] = []
    }
    roundMatches[match.round].push({ ...match })
  })

  // Sort rounds by order
  const roundOrder = {
    "Round of 128": 1,
    "Round of 64": 2,
    "Round of 32": 3,
    "Round of 16": 4,
    Quarterfinals: 5,
    Semifinals: 6,
    Final: 7,
  }

  const sortedRounds = Object.keys(roundMatches).sort((a, b) => (roundOrder[a] || 99) - (roundOrder[b] || 99))

  // Calculate days needed for each round
  const roundDays = {}
  let totalDaysNeeded = 0

  sortedRounds.forEach((round) => {
    const matchesInRound = roundMatches[round].length
    const daysNeeded = Math.ceil(matchesInRound / maxMatchesPerDay)
    roundDays[round] = daysNeeded
    totalDaysNeeded += daysNeeded
  })

  // Add rest days
  let restDaysCount = 0
  if (enableRestDays && sortedRounds.length > 1) {
    // Add rest days between rounds based on the interval
    restDaysCount = Math.max(0, (sortedRounds.length - 1) * restDayInterval)
    totalDaysNeeded += restDaysCount
  }

  // Check if we have enough days
  if (totalDaysNeeded > totalDays) {
    console.warn(`Warning: Tournament requires ${totalDaysNeeded} days but only ${totalDays} days are available`)
  }

  // Generate the schedule
  const schedule = []
  let currentDate = new Date(start)
  let dayCounter = 0

  sortedRounds.forEach((round, roundIndex) => {
    // Add rest day if needed
    if (roundIndex > 0 && enableRestDays) {
      // Add rest days between rounds based on the interval
      for (let i = 0; i < restDayInterval; i++) {
        // Check if we've exceeded available days
        if (dayCounter >= totalDays) {
          break
        }

        schedule.push({
          date: new Date(currentDate),
          isRestDay: true,
          round: null,
          matches: [],
        })

        // Move to next day
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
        dayCounter++
      }

      // Check if we've exceeded available days
      if (dayCounter >= totalDays) {
        return schedule
      }
    }

    // Distribute matches across days
    const matchesInRound = roundMatches[round]
    const daysForRound = roundDays[round]

    for (let day = 0; day < daysForRound; day++) {
      // Check if we've exceeded available days
      if (dayCounter >= totalDays) {
        break
      }

      const startIdx = day * maxMatchesPerDay
      const endIdx = Math.min(startIdx + maxMatchesPerDay, matchesInRound.length)
      const dayMatches = matchesInRound.slice(startIdx, endIdx)

      schedule.push({
        date: new Date(currentDate),
        isRestDay: false,
        round: round,
        matches: dayMatches.map((match) => ({
          id: match.id,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          venue: match.venue,
        })),
      })

      // Move to next day
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      dayCounter++
    }
  })

  return schedule
}
