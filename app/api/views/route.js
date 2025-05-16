// File: app/api/views/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Construct the absolute path to views.csv in the public folder
const VIEWS_FILE_PATH = path.join(process.cwd(), 'public', 'views.csv');

export async function GET(request) {
  try {
    let count = 0;

    // Check if the file exists
    if (fs.existsSync(VIEWS_FILE_PATH)) {
      const fileContent = fs.readFileSync(VIEWS_FILE_PATH, 'utf-8');
      // Assuming the CSV just contains a single number in the first line
      const parsedCount = parseInt(fileContent.trim().split('\n')[0], 10);
      if (!isNaN(parsedCount)) {
        count = parsedCount;
      } else {
        console.warn(`Content of ${VIEWS_FILE_PATH} is not a valid number. Starting from 0 for increment.`);
      }
    } else {
      console.warn(`${VIEWS_FILE_PATH} not found. Will be created with count 1.`);
    }

    // Increment the count
    const newCount = count + 1;

    // Write the new count back to the file
    const dir = path.dirname(VIEWS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VIEWS_FILE_PATH, newCount.toString(), 'utf-8');

    return NextResponse.json({ views: newCount });
  } catch (error) {
    console.error('Error processing view count in API:', error);
    return NextResponse.json(
      { error: 'Failed to update or retrieve view count', details: error.message },
      { status: 500 }
    );
  }
}