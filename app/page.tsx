import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">
          Dormitory Maintenance System
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          PNG University of Technology
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 font-medium"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded hover:bg-gray-50 font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}