import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const machines = [
    { name: "Induction Furnace (1 Ton)", capacity: "800 – 1000 kg", rate: "₹2,500 – ₹4,000" },
    { name: "Cupola Furnace", capacity: "1000 – 1500 kg", rate: "₹2,000 – ₹3,500" },
    { name: "Crucible Furnace", capacity: "100 – 300 kg", rate: "₹800 – ₹1,500" },
    { name: "Sand Mixer", capacity: "500 – 1000 kg sand", rate: "₹300 – ₹600" },
    { name: "Sand Muller", capacity: "300 – 800 kg", rate: "₹400 – ₹700" },
    { name: "Core Shooter Machine", capacity: "20 – 60 cores", rate: "₹500 – ₹1,000" },
    { name: "Core Baking Oven", capacity: "50 – 200 cores", rate: "₹300 – ₹800" },
    { name: "Moulding Machine (Manual)", capacity: "20 – 40 moulds", rate: "₹200 – ₹500" },
    { name: "Automatic Moulding Line (DISA)", capacity: "200 – 400 moulds", rate: "₹2,000 – ₹5,000" },
    { name: "Pouring Station (Manual)", capacity: "200 – 500 kg", rate: "₹300 – ₹700" },
    { name: "Die Casting Machine", capacity: "50 – 150 shots", rate: "₹1,500 – ₹3,500" },
    { name: "Shakeout Machine", capacity: "100 – 300 castings", rate: "₹400 – ₹900" },
    { name: "Shot Blasting Machine", capacity: "200 – 600 parts", rate: "₹600 – ₹1,200" },
    { name: "Grinding Machine", capacity: "30 – 80 parts", rate: "₹300 – ₹700" },
    { name: "Cutting Machine (Bandsaw)", capacity: "20 – 50 cuts", rate: "₹300 – ₹600" },
    { name: "CNC Turning Center", capacity: "10 – 30 parts", rate: "₹800 – ₹2,000" },
    { name: "VMC Machine", capacity: "5 – 20 parts", rate: "₹1,000 – ₹2,500" },
    { name: "Drilling Machine", capacity: "30 – 100 holes", rate: "₹200 – ₹500" },
    { name: "Milling Machine", capacity: "10 – 25 parts", rate: "₹500 – ₹1,200" },
    { name: "Heat Treatment Furnace", capacity: "200 – 800 kg", rate: "₹1,000 – ₹2,500" },
    { name: "Spectrometer", capacity: "5 – 10 tests", rate: "₹500 – ₹1,500" },
    { name: "Hardness Testing Machine", capacity: "20 – 50 tests", rate: "₹200 – ₹400" },
    { name: "Air Compressor", capacity: "—", rate: "₹300 – ₹800" }
];

function generateMachineCode(name) {
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = cleanName.split(/\s+/);
    let code = '';
    if (words.length >= 2) {
        code = words.map(w => w[0]).join('').toUpperCase();
    } else {
        code = words[0].substring(0, 3).toUpperCase();
    }
    return `MC-${code}-${Math.floor(100 + Math.random() * 900)}`;
}

function parseRange(rangeStr) {
    if (!rangeStr || rangeStr === '—') return 0;
    const matches = rangeStr.replace(/[^\d–-]/g, '').split(/[–-]/);
    if (matches.length === 2) {
        return (parseFloat(matches[0]) + parseFloat(matches[1])) / 2;
    }
    return parseFloat(matches[0]) || 0;
}

async function seedWorkstations() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nobalcasting',
            port: parseInt(process.env.DB_PORT || '3306')
        });

        console.log('✓ Connected to database');

        for (const machine of machines) {
            const machineCode = generateMachineCode(machine.name);
            const avgCapacity = parseRange(machine.capacity);
            const avgRate = parseRange(machine.rate);

            console.log(`Adding ${machine.name} (${machineCode})...`);

            await connection.query(
                `INSERT INTO workstation (name, workstation_name, description, location, capacity_per_hour, rate_per_hour, is_active, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 workstation_name = VALUES(workstation_name),
                 capacity_per_hour = VALUES(capacity_per_hour),
                 rate_per_hour = VALUES(rate_per_hour)`,
                [
                    machineCode, 
                    machine.name, 
                    `Capacity: ${machine.capacity}, Rate: ${machine.rate}`, 
                    'Main Workshop', 
                    avgCapacity, 
                    avgRate, 
                    true, 
                    'active'
                ]
            );
        }

        console.log('✓ All machines seeded successfully');

    } catch (error) {
        console.error('Error seeding machines:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedWorkstations();
