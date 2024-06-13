const axios = require('axios');
const fs = require('fs');
const { program } = require('commander');
const moment = require('moment');
require('dotenv').config(); // Load environment variables from .env file

// Read environment variables
const apiToken = process.env.TOGGL_API_TOKEN;
const workspaceId = parseInt(process.env.TOGGL_WORKSPACE_ID, 10);
const projectId = parseInt(process.env.TOGGL_PROJECT_ID, 10);

// Encode the API token for basic auth
const auth = Buffer.from(`${apiToken}:api_token`).toString('base64');

// Function to create a time entry
const createTimeEntry = async (holiday) => {
    try {
        const response = await axios.post(
            'https://api.track.toggl.com/api/v9/time_entries',
            {
                description: holiday.description,
                tags: ['holiday'],
                start: `${holiday.date}T04:00:00Z`,
                duration: holiday.duration,
                wid: workspaceId,
                pid: projectId, // Include the project ID
                created_with: 'Toggl API script'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                }
            }
        );
        console.log(`Holiday "${holiday.description}" on ${holiday.date} added successfully.`);
    } catch (error) {
        console.error(`Error adding holiday "${holiday.description}" on ${holiday.date}:`, error.response ? error.response.data : error.message);
    }
};

// Function to generate holiday entries from a date range, skipping weekends
const generateHolidays = (startDate, endDate, description) => {
    const holidays = [];
    let currentDate = moment(startDate);

    while (currentDate.isSameOrBefore(endDate)) {
        // Check if the current date is a weekend (Saturday or Sunday)
        if (currentDate.day() !== 0 && currentDate.day() !== 6) {
            holidays.push({
                description: description,
                date: currentDate.format('YYYY-MM-DD'),
                duration: 7.5 * 60 * 60 // 8 hours in seconds
            });
        }
        currentDate.add(1, 'day');
    }

    return holidays;
};

// Function to update holidays
const updateHolidays = async (holidays) => {
    for (const holiday of holidays) {
        await createTimeEntry(holiday);
    }
};

// Set up command-line arguments
program
    .option('-s, --start <date>', 'Start date (YYYY-MM-DD)')
    .option('-e, --end <date>', 'End date (YYYY-MM-DD)')
    .option('-d, --description <description>', 'Holiday description')
    .parse(process.argv);

// Get command-line arguments
const options = program.opts();

if (!options.start || !options.end || !options.description) {
    console.error('Start date, end date, and description are required.');
    process.exit(1);
}

// Generate holiday entries and update them in Toggl
const holidays = generateHolidays(options.start, options.end, options.description);
updateHolidays(holidays);
