import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

// GET /api/tournaments - Fetch tournaments (with optional status or archive filter)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const session = await auth()

    const whereClause: any = {}

    // If logged in, prioritize user's tournaments or public ones
    if (session?.user?.id) {
      whereClause.OR = [
        { userId: session.user.id },
        { isPublic: true },
      ]
    } else {
      whereClause.isPublic = true
    }

    if (status && status !== "ALL") {
      whereClause.status = status
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            teams: true,
            fixtures: true,
            venues: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ tournaments })
  } catch (error: any) {
    console.error("GET /api/tournaments error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tournaments." },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Save / Create a new tournament
export async function POST(req: Request) {
  try {
    const session = await auth()
    const body = await req.json()

    const {
      name,
      sportType,
      tournamentType,
      status,
      isPublic,
      algorithmOptions,
      teams,
      venues,
      fixtures,
      snapshotData,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Tournament name is required." },
        { status: 400 }
      )
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`

    // Determine user ID (if logged in or guest demo organizer)
    let userId = session?.user?.id

    if (!userId) {
      // Find or create default demo user for unauthenticated saves
      let demoUser = await prisma.user.findFirst({
        where: { email: "guest@tourneygen.local" },
      })
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            name: "Guest Organizer",
            email: "guest@tourneygen.local",
            role: "ORGANIZER",
          },
        })
      }
      userId = demoUser.id
    }

    const tournament = await prisma.tournament.create({
      data: {
        userId,
        name,
        slug: uniqueSlug,
        sportType: sportType || "General",
        tournamentType: tournamentType || "Knockout",
        status: status || "DRAFT",
        isPublic: Boolean(isPublic),
        algorithmOptions: algorithmOptions || {},
        teams: {
          create: (teams || []).map((t: any, idx: number) => ({
            name: typeof t === "string" ? t : t.name,
            seed: t.seed || idx + 1,
            rating: t.rating || 1000,
          })),
        },
        venues: {
          create: (venues || []).map((v: any, idx: number) => ({
            name: typeof v === "string" ? v : v.name,
            courtNumber: v.courtNumber || idx + 1,
          })),
        },
        ...(snapshotData
          ? {
              historySnapshots: {
                create: {
                  title: `Initial Setup (${new Date().toLocaleDateString()})`,
                  snapshotData: JSON.stringify(snapshotData),
                },
              },
            }
          : {}),
      },
      include: {
        teams: true,
        venues: true,
      },
    })

    return NextResponse.json({ tournament }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/tournaments error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create tournament." },
      { status: 500 }
    )
  }
}
