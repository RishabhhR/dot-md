import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-violet-400 tracking-wide">Contextual Labs</span>
        <p className="text-zinc-500 text-xs mt-1">Your .md file is your resume.</p>
      </div>
      <SignUp />
    </div>
  )
}
