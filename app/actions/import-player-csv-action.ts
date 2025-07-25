import { ActionFunction, redirect } from "react-router";

import { getUser } from "../loaders/user";
import { playerService } from "../services/playerService";

const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split("\n");
  const result: string[][] = [];

  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing - handles basic cases
      const row = line
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, ""));
      result.push(row);
    }
  }

  return result;
};

const formatDateOfBirth = (dob: string): string => {
  // Handle DD/MM/YYYY format specifically for CSV imports
  const ddmmyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dob.trim().match(ddmmyyyyPattern);

  if (!match) {
    throw new Error(`Invalid date format. Expected DD/MM/YYYY, got: ${dob}`);
  }

  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validate components
  if (year < 1900 || year > new Date().getFullYear() + 10) {
    throw new Error(
      `Invalid year: ${year}. Must be between 1900 and ${
        new Date().getFullYear() + 10
      }`
    );
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1 and 31`);
  }

  // Create date object to validate the combination (month is 0-indexed in Date constructor)
  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    throw new Error(`Invalid date: ${day}/${month}/${year} does not exist`);
  }

  // Return in YYYY-MM-DD format for Supabase
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
};

export const importPlayerCsvAction: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const { currentUser } = await getUser();
  const csvFile = formData.get("csv");

  if (!(csvFile instanceof File)) {
    return { error: "file not found" };
  }

  const errors: string[] = [];
  let successCount = 0;

  try {
    const csvText = await csvFile.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Check headers (case-insensitive)
    const headers = rows[0].map((h) => h.toLowerCase());
    const requiredHeaders = ["player name", "team", "age", "dob"];
    const headerMap: { [key: string]: number } = {};

    for (const required of requiredHeaders) {
      const index = headers.findIndex(
        (h) =>
          ((h.includes("name") || h.includes("player")) &&
            required === "player name") ||
          ((h.includes("team") || h.includes("club")) && required === "team") ||
          (h.includes("age") && required === "age") ||
          ((h.includes("dob") || h.includes("birth")) && required === "dob")
      );

      if (index === -1) {
        errors.push(`Missing required header: ${required}`);
        return;
      }

      headerMap[required] = index;
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      // Start from index 1 to skip header row
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        const name = row[headerMap["player name"]]?.trim();
        const team = row[headerMap["team"]]?.trim();
        const ageStr = row[headerMap["age"]]?.trim();
        const dobStr = row[headerMap["dob"]]?.trim();

        if (!name) {
          errors.push(`Row ${rowNumber}: Player name is required`);
          continue;
        }

        if (!team) {
          errors.push(`Row ${rowNumber}: Team is required`);
          continue;
        }

        if (!ageStr || !dobStr) {
          errors.push(`Row ${rowNumber}: Age and DOB are required`);
          continue;
        }

        const age = parseInt(ageStr);
        if (isNaN(age) || age < 5 || age > 50) {
          errors.push(`Row ${rowNumber}: Invalid age (${ageStr})`);
          continue;
        }

        let dateOfBirth: string;
        try {
          dateOfBirth = formatDateOfBirth(dobStr);
          // Use the proper age group calculation helper function based on DOB

          // Create player with calculated age group
          const playerData = {
            name,
            position: "-", // Default position
            dateOfBirth,
            nationality: "",
            club: team,
            school: "",
            height: "",
            foot: "Right" as const,
            photoUrl: "",
            email: "",
            teamId: currentUser.current_team,
          };

          await playerService.createPlayer(playerData, currentUser.id);
          successCount++;
        } catch (e) {
          errors.push(`Row ${rowNumber}: Invalid date format (${dobStr})`);
          console.log("failed to push", e);
          continue;
        }
      } catch (error) {
        errors.push(
          `Row ${rowNumber}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    errors.push(`File processing error: ${errorMessage}`);
    console.log(error);
  }

  return redirect("/dashboard/players");
};
