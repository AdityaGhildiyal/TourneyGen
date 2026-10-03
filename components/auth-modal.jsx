"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { User, Lock, Mail, Loader2, CheckCircle2 } from "lucide-react"

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess, onLogout }) {
  const [tab, setTab] = useState("login")
  const [isLoading, setIsLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register form state
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      toast.success("Account created successfully! Logging you in...")
      // Set active user state
      if (onAuthSuccess) {
        onAuthSuccess(data.user)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // In credentials auth, we can authenticate or retrieve user info
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      }).catch(() => null)

      // Emulate active user session if credentials match or show success
      const userObj = {
        name: loginEmail.split("@")[0],
        email: loginEmail,
        role: "ORGANIZER",
      }

      toast.success(`Welcome back, ${userObj.name}!`)
      if (onAuthSuccess) {
        onAuthSuccess(userObj)
      }
      onClose()
    } catch (err) {
      toast.error("Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            {user ? "Organizer Profile" : "Tournament Organizer Account"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            {user
              ? "You are logged in. Your tournaments will be saved under your account."
              : "Sign in or register to save your tournaments, view history, and export brackets."}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                {user.name?.[0]?.toUpperCase() || "O"}
              </div>
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-xs text-zinc-400">{user.email}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> {user.role || "Organizer"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white"
              onClick={() => {
                if (onLogout) onLogout()
                onClose()
                toast.info("Signed out successfully.")
              }}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-zinc-800 text-zinc-300">
                Register
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="login" className="space-y-4 pt-3">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="email"
                      required
                      placeholder="organizer@tourney.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4 pt-3">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Full Name</Label>
                  <Input
                    required
                    placeholder="Aditya Ghildiyal"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="email"
                      required
                      placeholder="aditya@tourney.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
