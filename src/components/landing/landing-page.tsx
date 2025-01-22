"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight, Video, Sparkles, Users } from "lucide-react";
import Image from "next/image";

interface LandingPageProps {
  isSignedIn: boolean;
}

export default function LandingPage({ isSignedIn }: LandingPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 px-4 lg:px-6 h-14 flex items-center border-b border-gray-800 bg-black z-50">
        <a className="flex items-center justify-center" href="#">
          <Video className="h-6 w-6 mr-2" />
          <span className="font-bold text-xl">PopReel</span>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#"
          >
            Creators
          </a>
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#"
          >
            Features
          </a>
          <a
            className="text-sm font-medium hover:text-primary transition-colors"
            href="#"
          >
            About
          </a>
        </nav>
      </header>

      <div className="flex flex-col lg:flex-row pt-14 flex-1">
        {/* Left side - Scrollable Content */}
        <div className="flex-1 lg:w-1/2 lg:flex-none overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <section className="min-h-[calc(100vh-6rem)] flex items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
                    Share Your Moments
                  </h1>
                  <p className="max-w-[600px] text-gray-400 md:text-xl">
                    Create, share, and discover short-form videos. Join millions
                    of creators expressing themselves through PopReel.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isSignedIn ? (
                    <Button className="inline-flex items-center justify-center bg-primary hover:bg-primary/90">
                      Start Creating
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <SignInButton mode="modal">
                        <Button
                          variant="default"
                          className="bg-primary hover:bg-primary/90"
                        >
                          Log In
                        </Button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <Button
                          variant="outline"
                          className="border-gray-700 bg-stone-500 hover:bg-gray-800"
                        >
                          Create Account
                        </Button>
                      </SignUpButton>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="py-16 border-t border-gray-800">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-12 bg-gradient-to-r from-primary to-purple-500 text-transparent bg-clip-text">
                Why PopReel?
              </h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="flex flex-col space-y-2 p-6 rounded-lg border border-gray-800">
                  <Sparkles className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="text-xl font-bold">Creative Tools</h3>
                  <p className="text-gray-400">
                    Powerful editing tools to make your content stand out.
                  </p>
                </div>
                <div className="flex flex-col space-y-2 p-6 rounded-lg border border-gray-800">
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="text-xl font-bold">Growing Community</h3>
                  <p className="text-gray-400">
                    Connect with creators and build your audience.
                  </p>
                </div>
                <div className="flex flex-col space-y-2 p-6 rounded-lg border border-gray-800">
                  <Video className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="text-xl font-bold">Trending Content</h3>
                  <p className="text-gray-400">
                    Discover what&apos;s hot and join the conversation.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right side - Future Video Feed */}
        <div className="hidden lg:block lg:w-1/2 bg-gray-900">
          <div className="relative h-full">
            <Image
              alt="PopReel Preview"
              className="object-cover"
              fill
              src="/placeholder.svg"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 text-sm text-gray-300">
              Future Infinite Scroll Feed
            </div>
          </div>
        </div>
      </div>

      <footer className="h-14 border-t border-gray-800 bg-black">
        <div className="h-full max-w-7xl mx-auto px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-xs text-gray-400">
            © 2024 PopReel. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6">
            <a
              className="text-xs text-gray-400 hover:text-primary transition-colors"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-xs text-gray-400 hover:text-primary transition-colors"
              href="#"
            >
              Privacy
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
