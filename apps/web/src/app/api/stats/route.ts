import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch the real-time data from the external analytics API
    const response = await fetch("https://shlink-neon.vercel.app/analytics/stats", {
      method: "GET",
      headers: {
        Accept: "/",
        "Accept-Language": "en-GB,en;q=0.5",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics stats: ${response.statusText}`);
    }

    // Parse the JSON data from the response
    const stats = await response.json();

    // Return the stats as a JSON response
    return NextResponse.json(stats);
  } catch (error) {
    // Handle errors and return an appropriate response
    console.error("Error fetching analytics stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics stats." },
      { status: 500 }
    );
  }
}
