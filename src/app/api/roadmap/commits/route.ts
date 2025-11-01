import { execSync } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Check if git is available (won't be in production environments like Vercel)
    try {
      execSync("git --version", { encoding: "utf-8", stdio: "ignore" });
    } catch {
      // Git not available - return friendly message
      return NextResponse.json({
        success: false,
        commits: [],
        error: "Git history is not available in this environment",
      });
    }

    // Execute git log command to get recent commits from the last 7 days
    const gitCommand = 'git log --since="7 days ago" --pretty=format:"%h|%ai|%s" --no-merges';
    const output = execSync(gitCommand, { encoding: "utf-8" });

    // Split output into individual commits
    const commits = output
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const [hash, datetime, message] = line.split("|");
        return {
          hash: hash ?? "",
          datetime: datetime ?? "",
          message: message ?? "",
        };
      });

    return NextResponse.json({
      success: true,
      commits,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching git commits:", error);

    // Return user-friendly error message
    return NextResponse.json({
      success: false,
      commits: [],
      error: "Unable to fetch commit history",
    });
  }
}
