import fs from 'fs';
import { Readable } from 'stream';

// Create a writable stream to the CSV file
const fileStream = fs.createWriteStream('large_numbers.csv', { flags: 'w' });

// Write CSV header
fileStream.write('id,formatted_number\n');

// Create a counter for tracking progress
let count = 0;
const totalRecords = 100000000;
const batchSize = 100000; // Process 100,000 records at a time
const logFrequency = 1000000; // Log progress every million records

// Create a readable stream that generates numbers in batches
const numberGenerator = new Readable({
    objectMode: true,
    read() {
        if (count >= totalRecords) {
            this.push(null); // End the stream
            return;
        }

        let batch = '';
        const batchEnd = Math.min(count + batchSize, totalRecords);

        for (let i = count; i < batchEnd; i++) {
            // Format the number with leading zeros (7 digits)
            const num = i % 10000000; // Cycle through 0-9999999
            const formattedNumber = num.toString().padStart(7, '0');

            // Add to batch
            batch += `${i},${formattedNumber}\n`;

            // Log progress periodically
            if ((i + 1) % logFrequency === 0 || i + 1 === totalRecords) {
                console.log(`Generated ${(i + 1).toLocaleString()} records (${(((i + 1) / totalRecords) * 100).toFixed(2)}%)`);
            }
        }

        count = batchEnd;
        this.push(batch);
    }
});

// Pipe to file
numberGenerator.pipe(fileStream);

// Handle completion
fileStream.on('finish', () => {
    console.log(`✅ Successfully created CSV with ${count.toLocaleString()} records`);
    console.log(`File saved as: large_numbers.csv`);
});

// Handle errors
numberGenerator.on('error', (err) => console.error('Generator error:', err));
fileStream.on('error', (err) => console.error('File write error:', err));
